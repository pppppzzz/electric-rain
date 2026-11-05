"""可复现生成 Flash 谱面和逐音符时间表；仅使用 Python 标准库。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# 元组为 (白键编号, 十六分音符格数)；0 为休止，8 为高音 Do。
jasmine = [(3,4),(3,2),(5,2),(6,2),(8,2),(8,2),(6,2),(5,4),(5,2),(6,2),(5,8)]
jingle = [
 (3,4),(3,4),(3,8), (3,4),(3,4),(3,8),
 (3,4),(5,4),(1,6),(2,2), (3,16),
 (4,4),(4,4),(4,6),(4,2), (4,4),(3,4),(3,4),(3,2),(3,2),
 (3,4),(2,4),(2,4),(3,4), (2,8),(5,8)]
doll = [(1,2),(2,2),(3,2),(4,2),
        (5,2),(5,2),(5,1),(4,1),(3,2),
        (4,2),(4,2),(4,1),(3,1),(2,2),
        (1,2),(3,2),(5,2),(0,2)]
SONGS = [
 ('茉莉花', 80, jasmine*4, '开头两小节动机重复四次，保留长短时值；是装置用循环片段，不是整首。原 G 调首调旋律移至 C，高音 1 记为 8。'),
 ('铃儿响叮当', 80, jingle, '副歌前八小节；采用常见“3 2 2 3 / 2—5—”接句版本，在半段结尾收束。全部在 C4~C5 内，不需八度折叠。'),
 ('洋娃娃和小熊跳舞', 80, doll*4, '选取开头四小节并重复四次；保留跳舞句两个十六分音符和句末休止。公开 D 调谱移至 C；不需八度折叠。')]

LEAD_MS = 1800
header = ['// 此文件由 ../generate_songs.py 生成。时间均为 ms。', '#pragma once',
          'const uint8_t MAX_SONG_NOTES=80;', f'const uint16_t SONG_LEAD_MS={LEAD_MS};']
md = ['# 《电子雨季》曲谱与时间配置', '',
 '联网核对日期：2026-11-03。下面是单声部课堂装置改编片段，无歌词、伴奏。',
 '编号 1~8 = C4 D4 E4 F4 G4 A4 B4 C5，0=休止。所有歌曲 80 BPM；四分音符 750 ms，十六分格 187.5 ms；累计起点四舍五入到 ms，避免逐音舍入漂移。',
 'start 是进入 PLAYING 后的命中中心时间，已加 FALL_MS=1800 ms 的下落前导；duration 是音乐时值，不是蜂鸣器持续时间。实际蜂鸣器固定短音，长音也只判一次，无须持续按住。',
 '修改旋律/BPM 后在本目录执行 `python generate_songs.py`；修改程序 FALL_MS 后也必须同步修改本脚本的 LEAD_MS，重新生成。', '',
 '## 来源与核对范围', '',
 '- 茉莉花：[制谱教学作者卢家宏，开头动机与两小节节奏](https://www.guitarlu.net/lesson-fsong-08-jasmine-flower.html)。只取已核对动机，未扩写未经核对的后半段。',
 '- 铃儿响叮当：[黄冈师范学院公开教材 PDF，第40页](https://music.hgnu.edu.cn/_upload/article/files/09/d4/faf43ffb4e08b61cf64ee0adaf16/ec5df379-7cae-4b24-9ece-880a54ee478b.pdf)。搜索索引能读到前八小节，整份 PDF 打开因体积限制失败；[公开简易旋律页面](https://pianoonline.cc/songs/jingle-bells/)用于交叉核对音序。附点及重复 Mi 的细分为本项目节奏编配，建议教师人工复核。',
 '- 洋娃娃和小熊跳舞：[公开幼儿歌曲弹唱资料](https://cxbwbook.com/uploads/file/20240710/%E5%B9%BC%E5%84%BF%E6%AD%8C%E6%9B%B2%E5%BC%B9%E5%94%B1.pdf)；[湘南幼专公开曲目资料](https://www.xnyesz.com/uploads/1/file/public/202311/20231115213157_md3qv5o7db.pdf)。搜索索引可核对开头四小节音序，后一 PDF 正文打开超时。十六分节奏按跳舞句编配，需对照教师持有版本复核。',
 '网上有同名异曲、不同节奏版本；本项目没有声称取得或逐像素验证全部原版乐谱。简化和重复均在下方标明。', '',
 '## 演奏速度限制', '',
 '最短格约 188 ms，HC-SR04 两次稳定采样及同音释放可能赶不上。保持谱面节奏特色的同时，此版允许未命中并继续，不能保证满分可达；先实测，必要时降低 BPM（会延长片段）、删减重复音或更换位置传感方案。不要仅缩短超声波周期来掩盖问题。', '']
for sid, (title, bpm, seq, desc) in enumerate(SONGS, 1):
    tick_ms = 60000 / bpm / 4
    tick = 0
    rows = []
    for note, ticks in seq:
        start = round(tick*tick_ms)
        tick += ticks
        duration = round(tick*tick_ms)-start
        rows.append((start+LEAD_MS,duration,note,ticks))
    total = round(tick*tick_ms)
    assert 20000 <= total <= 30000, (title,total)
    assert len(rows)<=80
    header += [f'const uint8_t SONG{sid}_COUNT={len(rows)};',
               f'const uint16_t SONG{sid}_DURATION={total};',
               f'const Note song{sid}[] PROGMEM={{']
    header += [f'  {{{s}, {d}, {n}}},' for s,d,n,_ in rows]
    header += ['};']
    md += [f'## {sid}. {title}', '', desc, '',
           f'音乐片段 {total/1000:.3f} 秒；另有前导 1.8 秒、判定尾窗 0.18 秒。共 {len(rows)} 条（含休止），计分音符 {sum(n!=0 for _,_,n,_ in rows)} 个。', '',
           '片段音序（括号内为十六分格数；下面完整表给出重复展开）：', '',
           '`'+' '.join(f'{n}({t})' for n,t in (jasmine if sid==1 else jingle if sid==2 else doll))+'`', '',
           '| id | 编号 | start/ms | duration/ms | 十六分格数 |', '|---:|---:|---:|---:|---:|']
    md += [f'| {i} | {n} | {s} | {d} | {t} |' for i,(s,d,n,t) in enumerate(rows)]
    md += ['']
(ROOT/'ElectricRain'/'Songs.h').write_text('\n'.join(header)+'\n',encoding='utf-8')
(ROOT/'songs.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print([(title, len(seq), round(sum(t for _,t in seq)*60000/bpm/4)) for title,bpm,seq,_ in SONGS])
