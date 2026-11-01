#!/bin/sh
# Landing page step images (public/landing/step-*.jpg) from the Meta launch template's real artifacts. Run from the repo root.
set -e
T=sandbox/templates/meta-vr-glasses-launch
F=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
D() { docker run --rm -v "$PWD":/w -w /w muse-harness ffmpeg -nostdin -y -loglevel error "$@"; }
P="scale=396:-2,pad=400:300:(ow-iw)/2:(oh-ih)/2:color=0xf4f4f4"
D -i lab/replicate/author-meta-launch/dissection/reference_shots_01.jpg -vf "crop=iw:iw*3/4:0:0,scale=1200:900" -q:v 3 public/landing/step-measure.jpg
D -i $T/set/char_man_sheet.jpg -i $T/set/product_glasses_sheet.jpg -i $T/set/loc_loft_living_room.jpg -i $T/set/char_friend_sheet.jpg -i $T/set/product_puck_sheet.jpg -i $T/set/loc_arena.jpg \
  -filter_complex "[0]$P[a];[1]$P[b];[2]$P[c];[3]$P[d];[4]$P[e];[5]$P[f];[a][b][c]hstack=3[r1];[d][e][f]hstack=3[r2];[r1][r2]vstack,pad=1200:900:0:150:color=0xf4f4f4" -q:v 3 public/landing/step-ingredients.jpg
G=""; i=0
for n in 03 04 05 06 07 09 21 22 28; do G="$G[$i]scale=392:220,pad=400:300:4:40:color=white,drawtext=fontfile=$F:text='$((i+1))':x=8:y=10:fontsize=20:fontcolor=0x999999[s$i];"; i=$((i+1)); done
D -i $T/boards/s03.jpg -i $T/boards/s04.jpg -i $T/boards/s05.jpg -i $T/boards/s06.jpg -i $T/boards/s07.jpg -i $T/boards/s09.jpg -i $T/boards/s21.jpg -i $T/boards/s22.jpg -i $T/boards/s28.jpg \
  -filter_complex "$G[s0][s1][s2]hstack=3[r1];[s3][s4][s5]hstack=3[r2];[s6][s7][s8]hstack=3[r3];[r1][r2][r3]vstack=3" -q:v 3 public/landing/step-boards.jpg
O=lab/replicate/compare30/meta-launch_orig30.mp4; R=lab/replicate/replica30-meta-launch/final/final.mp4
Q="scale=596:335,pad=600:339:2:2:color=white"
D -ss 8.5 -i $O -ss 8.5 -i $R -ss 24 -i $O -ss 24 -i $R \
  -filter_complex "[0:v]$Q[a];[1:v]$Q[b];[2:v]$Q[c];[3:v]$Q[d];[a][b]hstack[r1];[c][d]hstack[r2];[r1][r2]vstack,pad=1200:900:0:111:color=white,drawtext=fontfile=$F:text='REAL AD':x=300-tw/2:y=60:fontsize=28:fontcolor=0x6b6b6b,drawtext=fontfile=$F:text='REBUILT BLIND':x=900-tw/2:y=60:fontsize=28:fontcolor=0x1a4be0" \
  -frames:v 1 -q:v 3 public/landing/step-proof.jpg
