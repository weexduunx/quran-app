/**
 * Symbole de l'app : étoile à huit branches (Rub el-Hizb) autour d'un moushaf
 * ouvert. Les trois pointes du bas portent le vert, le jaune et le rouge du
 * drapeau sénégalais. Mêmes coordonnées que scripts/generate-brand-assets.py.
 */
import React, { useId } from 'react';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

export const APP_NAME = 'Bayân';
export const APP_NAME_AR = 'البيان';
export const APP_TAGLINE = 'Lire · Écouter · Comprendre';

const STAR =
  'M50 13.2 L60.8 24 L76 24 L76 39.2 L86.8 50 L76 60.8 L76 76 L60.8 76 L50 86.8 L39.2 76 L24 76 L24 60.8 L13.2 50 L24 39.2 L24 24 L39.2 24 Z';
const PAGE_L = 'M48.6 39.5 C43 35.6 36.6 35.4 31.5 37.6 L31.5 61.6 C36.6 59.4 43 59.6 48.6 63.5 Z';
const PAGE_R = 'M51.4 39.5 C57 35.6 63.4 35.4 68.5 37.6 L68.5 61.6 C63.4 59.4 57 59.6 51.4 63.5 Z';

export function BrandMark({
  size = 120,
  /** 'dark' : sur fond émeraude ; 'light' : sur fond clair */
  tone = 'dark',
  strokeWidth = 3.2,
}: {
  size?: number;
  tone?: 'dark' | 'light';
  strokeWidth?: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const top = tone === 'dark' ? '#E9D49A' : '#B08A3E';
  const green = tone === 'dark' ? '#1FA35C' : '#00853F';
  const pages = tone === 'dark' ? '#F3EEDF' : '#12664B';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={APP_NAME}>
      <Defs>
        <ClipPath id={`${id}t`}>
          <Rect x="0" y="0" width="100" height="57" />
        </ClipPath>
        <ClipPath id={`${id}g`}>
          <Rect x="0" y="57" width="37" height="43" />
        </ClipPath>
        <ClipPath id={`${id}y`}>
          <Rect x="37" y="57" width="26" height="43" />
        </ClipPath>
        <ClipPath id={`${id}r`}>
          <Rect x="63" y="57" width="37" height="43" />
        </ClipPath>
      </Defs>
      <G fill="none" strokeWidth={strokeWidth} strokeLinejoin="round">
        <Path d={STAR} stroke={top} clipPath={`url(#${id}t)`} />
        <Path d={STAR} stroke={green} clipPath={`url(#${id}g)`} />
        <Path d={STAR} stroke="#FDEF42" clipPath={`url(#${id}y)`} />
        <Path d={STAR} stroke="#E31B23" clipPath={`url(#${id}r)`} />
      </G>
      <Path d={PAGE_L} fill={pages} />
      <Path d={PAGE_R} fill={pages} />
    </Svg>
  );
}
