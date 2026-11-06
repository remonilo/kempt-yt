#!/bin/sh
# Frames screenshot masters the way the site and README show them: rounded corners, a thin grey bezel and a soft
# shadow on transparent. usage: scripts/frame-shots.sh <out dir> <in.png>... (name kept). Needs ImageMagick 7.
set -e
out=$1; shift
mkdir -p "$out"
for f in "$@"; do
  w=$(magick identify -format %w "$f"); h=$(magick identify -format %h "$f")
  r=$((w / 90)); b=$((w / 360))
  magick "$f" \
    \( -size "${w}x${h}" xc:none -fill white -draw "roundrectangle 0,0,$((w - 1)),$((h - 1)),$r,$r" \) \
    -alpha set -compose DstIn -composite \
    \( -size "$((w + 2 * b))x$((h + 2 * b))" xc:none -fill '#3b3b3b' \
       -draw "roundrectangle 0,0,$((w + 2 * b - 1)),$((h + 2 * b - 1)),$((r + b)),$((r + b))" \) \
    +swap -gravity center -compose Over -composite \
    \( +clone -background black -shadow 45x$((w / 40))+0+$((w / 120)) \) +swap \
    -background none -compose Over -layers merge +repage \
    -depth 8 "$out/$(basename "$f")"
  echo "framed $out/$(basename "$f")"
done
