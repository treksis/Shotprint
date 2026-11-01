#!/bin/sh
# Pitch reel (local only: the films still use template scores): ten Meta product films made from templates.
set -e
F=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf; RG=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
seg() { # ws start dur title from out
  docker run --rm -v "$PWD":/w -w /w muse-harness ffmpeg -nostdin -y -loglevel error -ss $2 -t $3 -i replicate/fill-$1/final/final.mp4 -filter_complex \
"[0:v]fps=30,scale=1920:1080,setsar=1,drawbox=x=0:y=ih-150:w=iw:h=150:color=black@0.55:t=fill,\
drawtext=fontfile=$F:text='$4':x=60:y=h-120:fontsize=44:fontcolor=white,\
drawtext=fontfile=$RG:text='made from the $5 template':x=60:y=h-62:fontsize=30:fontcolor=0xd0d0d0,\
fade=t=in:st=0:d=0.2,fade=t=out:st=$(echo "$3-0.2"|bc):d=0.2[v];[0:a]aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.15,afade=t=out:st=$(echo "$3-0.25"|bc):d=0.25[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k pitch/$6
}
seg rayban-display 2.0 4.0 'Meta Ray-Ban Display' 'hardware launch' r1.mp4
seg quest-reveal 19.0 4.0 'Meta Quest 3S' 'phone reveal' r2.mp4
seg rayban-fans 11.0 4.0 'Ray-Ban Meta' 'fan moments' r3.mp4
seg marketplace-dorm 20.5 4.0 'Facebook Marketplace' 'room makeover' r4.mp4
seg whatsapp-farm 7.0 4.0 'WhatsApp' 'farm story' r5.mp4
seg meta-ai-deadpan 22.0 4.0 'Meta AI' 'deadpan dialogue' r6.mp4
seg meta-ai-intro 4.0 4.0 'Meta AI app' 'agent intro' r7.mp4
seg rayban-gift 7.0 4.0 'Ray-Ban Meta gift' 'holiday story' r8.mp4
seg quest3-dark 20.5 4.0 'Meta Quest 3' 'car launch' r9.mp4
seg threads-legend 13.0 4.0 'Threads' 'athlete monologue' r10.mp4
docker run --rm -v "$PWD":/w -w /w muse-harness ffmpeg -nostdin -y -loglevel error -f lavfi -i color=c=0x121418:s=1920x1080:r=30:d=3 -f lavfi -i anullsrc=r=48000:cl=stereo -t 3 -vf \
"drawtext=fontfile=$F:text='Same recipe. Your product.':x=(w-tw)/2:y=470:fontsize=80:fontcolor=white,fade=t=in:st=0:d=0.3" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest pitch/r11.mp4
printf "file 'r%s.mp4'\n" 1 2 3 4 5 6 7 8 9 10 11 > pitch/reel.txt
docker run --rm -v "$PWD":/w -w /w muse-harness ffmpeg -nostdin -y -loglevel error -f concat -safe 0 -i pitch/reel.txt -c:v libx264 -crf 21 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k pitch/meta_products_reel.mp4
rm pitch/r[0-9]*.mp4 pitch/reel.txt
