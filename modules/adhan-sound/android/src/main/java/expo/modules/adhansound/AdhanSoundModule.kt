package expo.modules.adhansound

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.provider.Settings
import android.provider.MediaStore
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

/**
 * Adhans ajoutés par l'utilisateur.
 *
 * expo-notifications ne sait jouer que des sons intégrés à l'APK (res/raw).
 * Ici, le fichier choisi est copié dans les sonneries de notification du
 * téléphone (MediaStore, dossier Notifications/Bayan), puis un canal Android
 * est créé avec ce son. Les notifications programmées par expo-notifications
 * sur ce canal jouent alors l'adhan de l'utilisateur. Android 10 et plus.
 */
class AdhanSoundModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val notifications: NotificationManager
    get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  override fun definition() = ModuleDefinition {
    Name("AdhanSound")

    Function("isSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
    }

    /** Vrai si le son (res/raw, sans extension) est bien intégré à cet APK */
    Function("hasRawSound") { name: String ->
      context.resources.getIdentifier(name, "raw", context.packageName) != 0
    }

    /** Notifications programmées à l'heure exacte (sinon Android peut les retarder ou les perdre en veille) */
    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
    }

    /** Page système « Alarmes et rappels » de l'app */
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        startSettings(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")))
      } else {
        startSettings(appDetails())
      }
    }

    /** Vrai si l'app échappe à l'optimisation de batterie (rappels fiables en veille) */
    Function("isIgnoringBatteryOptimizations") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return@Function true
      (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(context.packageName)
    }

    /** Liste système des optimisations de batterie (pas de demande directe : règle Play Store) */
    Function("openBatterySettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        startSettings(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
      } else {
        startSettings(appDetails())
      }
    }

    /** Copie le fichier, crée le canal ; renvoie l'URI content:// du son. */
    AsyncFunction("installAsync") { sourceUri: String, fileName: String, channelId: String, channelName: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        throw CodedException("ERR_ADHAN_UNSUPPORTED", "Android 10 ou plus est nécessaire", null)
      }
      val resolver = context.contentResolver
      val source = Uri.parse(sourceUri)
      val mime = (if (source.scheme == "content") resolver.getType(source) else null) ?: mimeFor(fileName)

      val values = ContentValues().apply {
        put(MediaStore.Audio.Media.DISPLAY_NAME, fileName)
        put(MediaStore.Audio.Media.MIME_TYPE, mime)
        put(MediaStore.Audio.Media.RELATIVE_PATH, "${Environment.DIRECTORY_NOTIFICATIONS}/Bayan")
        put(MediaStore.Audio.Media.IS_NOTIFICATION, 1)
        put(MediaStore.Audio.Media.IS_MUSIC, 0)
        put(MediaStore.Audio.Media.IS_PENDING, 1)
      }
      val collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      val target = resolver.insert(collection, values)
        ?: throw CodedException("ERR_ADHAN_COPY", "Impossible d'enregistrer le son", null)

      try {
        openInput(source).use { input ->
          val output = resolver.openOutputStream(target)
            ?: throw CodedException("ERR_ADHAN_COPY", "Impossible d'écrire le son", null)
          output.use { input.copyTo(it) }
        }
        resolver.update(target, ContentValues().apply { put(MediaStore.Audio.Media.IS_PENDING, 0) }, null, null)
      } catch (e: Throwable) {
        resolver.delete(target, null, null)
        throw e
      }

      createChannel(channelId, channelName, target)
      target.toString()
    }

    /** Supprime le canal et le fichier copié. */
    AsyncFunction("removeAsync") { soundUri: String, channelId: String ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        notifications.deleteNotificationChannel(channelId)
      }
      try {
        context.contentResolver.delete(Uri.parse(soundUri), null, null)
      } catch (_: Throwable) {
        // Fichier déjà supprimé par l'utilisateur : rien à faire
      }
      Unit
    }
  }

  private fun appDetails() =
    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))

  private fun startSettings(intent: Intent) {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(intent)
    } catch (_: Throwable) {
      // Page absente sur certaines surcouches constructeur : fiche de l'app
      context.startActivity(appDetails().addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }

  private fun createChannel(id: String, name: String, sound: Uri) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
      .build()
    val channel = NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Appel à la prière joué à l'heure de chaque prière"
      setSound(sound, attributes)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 400, 200, 400)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    notifications.createNotificationChannel(channel)
  }

  private fun openInput(uri: Uri): InputStream =
    if (uri.scheme == "file" || uri.scheme == null) {
      FileInputStream(File(uri.path ?: throw CodedException("ERR_ADHAN_COPY", "Fichier introuvable", null)))
    } else {
      context.contentResolver.openInputStream(uri)
        ?: throw CodedException("ERR_ADHAN_COPY", "Fichier illisible", null)
    }

  private fun mimeFor(fileName: String): String =
    when (fileName.substringAfterLast('.', "").lowercase()) {
      "mp3" -> "audio/mpeg"
      "m4a", "aac" -> "audio/mp4"
      "ogg", "oga" -> "audio/ogg"
      "wav" -> "audio/wav"
      "opus" -> "audio/opus"
      else -> "audio/mpeg"
    }
}
