#!/bin/sh
# The landing page's hook video: real Meta films (left) next to rebuilds made blind from their templates (right).
# Run from lab/. Writes pitch/hook.mp4 and pitch/hook-poster.jpg.
set -e
F=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
R=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
seg() { # id start dur caption out
  docker run --rm -v "$PWD":/w -w /w muse-harness ffmpeg -nostdin -y -loglevel error \
    -ss $2 -t $3 -i replicate/compare30/$1_orig30.mp4 -ss $2 -t $3 -i replicate/replica30-$1/final/final.mp4 -filter_complex \
"[0:v]fps=30,scale=944:531,setsar=1[a];[1:v]fps=30,scale=944:531,setsar=1[b];\
color=c=0x0b0b0b:s=1920x1080:r=30:d=$3[bg];\
[bg][a]overlay=x=16:y=250[t1];[t1][b]overlay=x=960:y=250,\
drawtext=fontfile=$F:text='REAL AD':x=16+(944-tw)/2:y=200:fontsize=30:fontcolor=0xbdbdbd,\
drawtext=fontfile=$F:text='REBUILT BLIND FROM ITS TEMPLATE':x=960+(944-tw)/2:y=200:fontsize=30:fontcolor=white,\
drawtext=fontfile=$R:text='$4':x=(w-tw)/2:y=820:fontsize=34:fontcolor=0x9a9a9a,\
fade=t=in:st=0:d=0.25,fade=t=out:st=$(echo "$3-0.25"|bc):d=0.25[v];\
[1:a]afade=t=in:d=0.2,afade=t=out:st=$(echo "$3-0.3"|bc):d=0.3,aformat=sample_rates=48000:channel_layouts=stereo[au]" \
    -map "[v]" -map "[au]" -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -c:a aac -b:a 160k pitch/$5
}
seg meta-launch 0.5 5.0 'Meta VR Glasses launch film, 30 s spot' h1.mp4
seg meta-launch 5.6 4.5 'Meta VR Glasses launch film, 30 s spot' h2.mp4
seg meta-launch 20.4 5.0 'Meta VR Glasses launch film, 30 s spot' h3.mp4
seg muse-introduction 2.1 5.5 'Introducing Muse, 30 s spot' h4.mp4
seg muse-introduction 15.2 6.2 'Introducing Muse, 30 s spot' h5.mp4
seg muse-tour 3.85 5.15 'Muse feature tour, 30 s spot' h6.mp4
# End card
docker run --rm -v "$PWD":/w -w /w muse-harness ffmpeg -nostdin -y -loglevel error -f lavfi -i color=c=0x0b0b0b:s=1920x1080:r=30:d=3 -f lavfi -i anullsrc=r=48000:cl=stereo -t 3 -vf \
"drawtext=fontfile=$F:text='Same shots. Same timing.':x=(w-tw)/2:y=440:fontsize=72:fontcolor=white,\
drawtext=fontfile=$F:text='Your product.':x=(w-tw)/2:y=540:fontsize=72:fontcolor=0x5b8cff,\
fade=t=in:st=0:d=0.3" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest pitch/h7.mp4
printf "file 'h%s.mp4'\n" 1 2 3 4 5 6 7 > pitch/hook.txt
docker run --rm -v "$PWD":/w -w /w muse-harness ffmpeg -nostdin -y -loglevel error -f concat -safe 0 -i pitch/hook.txt -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k pitch/hook.mp4
docker run --rm -v "$PWD":/w -w /w muse-harness ffmpeg -nostdin -y -loglevel error -ss 2.2 -i pitch/hook.mp4 -frames:v 1 -q:v 3 pitch/hook-poster.jpg
rm pitch/h?.mp4 pitch/hook.txt
