#!/usr/bin/env bash
# Aufbereitung der Samples für „Einsatz finden“ (echte Instrumente, alle Songs).
# Quellen vorher holen:
#   VCSL:  git clone --filter=blob:none --no-checkout https://github.com/sgossner/VCSL /tmp/claude-0/vcsl
#          und die unten genannten Dateien mit `git checkout HEAD -- <Pfad>` auschecken
#   FluidR3_GM: https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/<instrument>-mp3/<Ton>.mp3
#          (Ton mit b-Namen, z. B. Gb2), abgelegt als /tmp/claude-0/src/fl/<instrument>/<MIDI>.mp3
#          Töne je Instrument: siehe SAMPLE_INST in uebe-lab.html (alle drei Halbtöne).
# Braucht ffmpeg mit libmp3lame.
# Nur einzelne Ordner neu erzeugen: ONLY="piano strings" ./aufbereiten.sh
# (ohne ONLY alles; Schlagzeug nur, wenn ONLY leer ist oder „drums“ enthält).
set -e
want(){ [ -z "$ONLY" ] || [[ " $ONLY " == *" $1 "* ]]; }
V=/tmp/claude-0/vcsl; FL=/tmp/claude-0/src/fl; OUT=$(cd "$(dirname "$0")" && pwd)
peak(){ ffmpeg -hide_banner -nostats -i "$1" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-\?[0-9.]*\) dB/\1/p'; }
# enc SRC DST LEN GAIN_DB BITRATE [extra filters] [Ausblenden in s, sonst 40 % von LEN]
enc(){ local L=$3; local fd=${7:-$(python3 -c "print(round($L*0.4,3))")}; local fo=$(python3 -c "print(round($L-$fd,3))");
  ffmpeg -hide_banner -loglevel error -y -i "$1" -af "aformat=channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.002${6:+,$6},atrim=0:$L,volume=${4}dB,afade=t=out:st=$fo:d=$fd" -ac 1 -ar 44100 -c:a libmp3lame -b:a $5 "$2"; }
if [ -d "$V" ] && want drums; then
mkdir -p $OUT/drums
d(){ local p=$(peak "$V/$1"); enc "$V/$1" $OUT/drums/$2.mp3 $3 $(python3 -c "print(round(-1-($p),2))") 96k "$4"; }
d "Membranophones/Struck Membranophones/Bass Drum 2/bassdrum_hit_f.wav" kick 0.45 "highpass=f=35"
d "Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_HitSN_v7_rr1_Mid.wav" snare 0.4
d "Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_HitSN_v5_rr1_Mid.wav" snare-soft 0.35
d "Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_stick_v1_rr1_Mid.wav" rim 0.15
d "Idiophones/Struck Idiophones/Hi-Hat Cymbal/HiHat_HitC_v3_rr1_Mid.wav" hat 0.12
d "Idiophones/Struck Idiophones/Hi-Hat Cymbal/HiHat_HitC_v2_rr2_Mid.wav" hat-soft 0.1
d "Idiophones/Struck Idiophones/Hi-Hat Cymbal/HiHat_HitO_rr1_Mid.wav" open 0.6
d "Membranophones/Struck Membranophones/Tom 1/Stick/TomH_HitS_v4_rr1_Mid.wav" tom-hi 0.5
d "Membranophones/Struck Membranophones/Tom 2/Stick/TomL_HitS_v4_rr1_Mid.wav" tom-lo 0.6
d "Idiophones/Struck Idiophones/Suspended Cymbal 2/susCymb2_hit_stick_mf1.wav" crash 1.6
d "Idiophones/Struck Idiophones/Claps/Clap_rr1.wav" clap 0.3
d "Idiophones/Struck Idiophones/Suspended Cymbal 2/susCymb2_hit_stick_mp1.wav" ride 1.2
d "Idiophones/Struck Idiophones/Suspended Cymbal 2/susCymb2_hit_bell_f1.wav" ride-bell 1.2
d "Idiophones/Struck Idiophones/Tambourine 1/Tamb1_Hit_v2_rr1_Mid.wav" tamb 0.35
d "Idiophones/Struck Idiophones/Shaker, Small/Mid_ShakerDouble_Down_rr1.wav" shaker 0.2
# snap: in VCSL gibt es keinen Fingerschnipser – bewusst ausgelassen (keine Quelle ohne geklärte Lizenz).
fi
# Instrumente: eine Verstärkung je Instrument (lautester Ton → −1 dB), Verhältnis der Töne bleibt
inst(){ local src=$1 dst=$2 L=$3 fd=$4; want $dst || return 0; rm -rf $OUT/$dst; mkdir -p $OUT/$dst; local mx=-99; for f in $FL/$src/*.mp3; do p=$(peak $f); mx=$(python3 -c "print(max($mx,$p))"); done
  for f in $FL/$src/*.mp3; do enc $f $OUT/$dst/$(basename $f) $L $(python3 -c "print(round(-1-($mx),2))") 64k "" $fd; done; }
inst electric_bass_finger bass 1.6
# Klavier: Salamander Grand Piano (Tone.js-Fassung), unverändert übernommen –
# gekürzt wird erst beim Laden (piano-samples.js). Holen mit ONLY=salamander.
if want salamander && [ -z "$NO_FETCH" ]; then
  mkdir -p $OUT/salamander
  N=([0]=C [3]=Ds [6]=Fs [9]=A)
  for m in $(seq 24 3 96); do
    curl -sf -o "$OUT/salamander/$m.mp3" "https://raw.githubusercontent.com/Tonejs/audio/master/salamander/${N[$((m%12))]}$((m/12-1)).mp3"
  done
fi
# Streicher: die Quelle hält 3,1 s ohne Abklingen – nur kurz ausblenden; längere
# Flächen setzt die App aus überblendeten Stücken zusammen (sampleNote, loopFrom).
inst string_ensemble_1 strings 3.1 0.15
inst electric_guitar_clean guitar 1.8
inst choir_aahs choir 3.1 0.15
inst brass_section brass 1.2
