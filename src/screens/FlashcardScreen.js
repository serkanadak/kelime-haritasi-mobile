import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { WORDS, applyEdits } from '../data';
import { useProgress } from '../state/ProgressContext';
import { selectForQuiz, STATUS } from '../logic/srs';
import { StatusPicker, LevelBadge, Badge } from '../components/common';
import { colors, LEVEL_COLORS } from '../theme';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.28;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Kaydırmalı + çevirmeli flashcard destesi. Bilinmeyen/pasif kelimelere
// öncelik verir (Özellik 4). Sağa kaydır = biliyorum, sola = bilmiyorum.
export default function FlashcardScreen({ navigation }) {
  const { getProgress, setStatus, mergeProgress } = useProgress();

  const [direction, setDirection] = useState('en-tr'); // 'en-tr' | 'tr-en'
  const [levels, setLevels] = useState([]); // boş = tüm seviyeler

  const deck = useMemo(
    () => {
      const pool = levels.length ? WORDS.filter((w) => levels.includes(w.level)) : WORDS;
      return selectForQuiz(pool, getProgress, Math.min(pool.length, 40));
    },
    // Seviye seçimi değişince deste yeniden kurulur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levels]
  );

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const toggleLevel = (lvl) => {
    setLevels((prev) => (prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]));
    setIndex(0);
    resetFlip();
    position.setValue({ x: 0, y: 0 });
  };

  const position = useRef(new Animated.ValueXY()).current;
  const flip = useRef(new Animated.Value(0)).current;
  const flipValue = useRef(0);

  const baseWord = deck[index];
  const word = baseWord ? applyEdits(baseWord, getProgress(baseWord.id)?.edits) : null;

  const doFlip = () => {
    const to = flipValue.current === 0 ? 180 : 0;
    flipValue.current = to;
    setFlipped(to === 180);
    Animated.spring(flip, { toValue: to, useNativeDriver: true, friction: 8, tension: 10 }).start();
  };

  const resetFlip = () => {
    flipValue.current = 0;
    setFlipped(false);
    flip.setValue(0);
  };

  const advance = () => {
    resetFlip();
    position.setValue({ x: 0, y: 0 });
    setIndex((i) => (i + 1) % deck.length);
  };

  const onSwipeComplete = (dir) => {
    if (word) setStatus(word.id, dir === 'right' ? STATUS.ACTIVE : STATUS.UNKNOWN);
    advance();
  };

  const forceSwipe = (dir) => {
    Animated.timing(position, {
      toValue: { x: dir === 'right' ? width * 1.4 : -width * 1.4, y: 0 },
      duration: 220,
      useNativeDriver: true,
    }).start(() => onSwipeComplete(dir));
  };

  const resetPosition = () => {
    Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (e, g) => position.setValue({ x: g.dx, y: g.dy * 0.2 }),
      onPanResponderRelease: (e, g) => {
        if (g.dx > SWIPE_THRESHOLD) forceSwipe('right');
        else if (g.dx < -SWIPE_THRESHOLD) forceSwipe('left');
        else resetPosition();
      },
    })
  ).current;

  // Yön + seviye filtresi (boş deste durumunda da erişilebilir olmalı).
  const filterBar = (
    <>
      <View style={styles.topBar}>
        {[
          { key: 'en-tr', label: 'İng→Tür' },
          { key: 'tr-en', label: 'Tür→İng' },
        ].map((o) => {
          const on = direction === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.dirBtn, on && styles.dirBtnOn]}
              onPress={() => {
                setDirection(o.key);
                resetFlip();
              }}
            >
              <Text style={[styles.dirText, on && styles.dirTextOn]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.levelRow}>
        {LEVELS.map((lvl) => {
          const on = levels.includes(lvl);
          return (
            <TouchableOpacity
              key={lvl}
              style={[styles.levelChip, on && { backgroundColor: LEVEL_COLORS[lvl], borderColor: LEVEL_COLORS[lvl] }]}
              onPress={() => toggleLevel(lvl)}
            >
              <Text style={[styles.levelChipText, on && { color: '#0f172a' }]}>{lvl}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  if (!word) {
    return (
      <View style={styles.container}>
        {filterBar}
        <View style={styles.center}>
          <Text style={styles.muted}>
            {levels.length
              ? 'Seçili seviyede gösterilecek kart yok. Başka seviye seç.'
              : 'Gösterilecek kart yok.'}
          </Text>
        </View>
      </View>
    );
  }

  // İşaretsiz kelimeler varsayılan olarak "Bilmiyorum" kabul edilir.
  const status = getProgress(word.id)?.status || STATUS.UNKNOWN;

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-12deg', '0deg', '12deg'],
  });
  const knowOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1] });
  const dontOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0] });

  const frontRotate = flip.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flip.interpolate({ inputRange: [89, 90], outputRange: [1, 0], extrapolate: 'clamp' });
  const backOpacity = flip.interpolate({ inputRange: [90, 91], outputRange: [0, 1], extrapolate: 'clamp' });

  const muted = !!getProgress(word.id)?.muted;
  const toggleMute = () => {
    mergeProgress(word.id, { muted: !muted });
    // Susturulan kelime destede kalmasın diye ilerle.
    if (!muted) advance();
  };

  return (
    <View style={styles.container}>
      {filterBar}
      <Text style={styles.counter}>
        {index + 1} / {deck.length}
      </Text>

      <View style={styles.cardArea}>
        <Animated.View
          style={[
            styles.animatedCard,
            { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Kaydırma etiketleri */}
          <Animated.View style={[styles.tag, styles.tagKnow, { opacity: knowOpacity }]}>
            <Text style={styles.tagKnowText}>BİLİYORUM</Text>
          </Animated.View>
          <Animated.View style={[styles.tag, styles.tagDont, { opacity: dontOpacity }]}>
            <Text style={styles.tagDontText}>BİLMİYORUM</Text>
          </Animated.View>

          <Pressable style={styles.pressArea} onPress={doFlip}>
            {/* Ön yüz */}
            <Animated.View
              style={[
                styles.face,
                { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
              ]}
            >
              {direction === 'tr-en' ? (
                <>
                  {word.meanings.slice(0, 3).map((m, i) => (
                    <Text key={i} style={styles.frontTr}>• {m.tr}</Text>
                  ))}
                  <Text style={styles.pos}>{word.pos}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.headword}>{word.headword}</Text>
                  {!!word.pronunciation && <Text style={styles.pron}>{word.pronunciation}</Text>}
                  <Text style={styles.pos}>{word.pos}</Text>
                </>
              )}
              <View style={styles.row}>
                <LevelBadge level={word.level} />
                {word.domains.map((d) => (
                  <Badge key={d} label={d} />
                ))}
              </View>
              <Text style={styles.tapHint}>
                {direction === 'tr-en' ? 'İngilizcesi için dokun' : 'Çevirmek için dokun'} · kaydır ↔
              </Text>
            </Animated.View>

            {/* Arka yüz */}
            <Animated.View
              style={[
                styles.face,
                styles.faceBack,
                { opacity: backOpacity, transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
              ]}
            >
              <ScrollView contentContainerStyle={styles.cardBack}>
                <View style={styles.backHead}>
                  <Text style={styles.backHeadword}>{word.headword}</Text>
                  {!!word.pronunciation && <Text style={styles.pron}>{word.pronunciation}</Text>}
                </View>
                {word.meanings.map((m, i) => (
                  <View key={i} style={styles.meaningBlock}>
                    <Text style={styles.meaningTr}>• {m.tr}</Text>
                    {!!m.en && <Text style={styles.meaningEn}>{m.en}</Text>}
                    <Text style={styles.exampleEn}>“{m.exampleEn}”</Text>
                    {!!m.exampleTr && <Text style={styles.exampleTr}>{m.exampleTr}</Text>}
                  </View>
                ))}
                {!!word.synonyms?.length && (
                  <Text style={styles.relLine}>
                    <Text style={styles.relLabelSyn}>Eş: </Text>
                    {word.synonyms.join(', ')}
                  </Text>
                )}
                {!!word.antonyms?.length && (
                  <Text style={styles.relLine}>
                    <Text style={styles.relLabelAnt}>Zıt: </Text>
                    {word.antonyms.join(', ')}
                  </Text>
                )}
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.statusWrap}>
        <Text style={styles.statusTitle}>Bu kelimeyi:</Text>
        <StatusPicker value={status} onChange={(s) => setStatus(word.id, s)} />
      </View>

      <TouchableOpacity style={styles.muteRow} onPress={toggleMute}>
        <Text style={[styles.muteText, muted && styles.muteTextOn]}>
          {muted ? '🔕 Hatırlatma kapalı — tekrar açmak için dokun' : '🔔 Bu kelimeyi bir daha hatırlatma'}
        </Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.navBtn} onPress={() => forceSwipe('left')}>
          <Text style={styles.navText}>✗ Bilmiyorum</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate('WordDetail', { id: word.id })}
        >
          <Text style={styles.linkText}>Detay</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate('Ağ', { id: word.id })}
        >
          <Text style={styles.linkText}>Ağ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navBtn, styles.navKnow]} onPress={() => forceSwipe('right')}>
          <Text style={[styles.navText, { color: '#0f172a' }]}>✓ Biliyorum</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  topBar: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  dirBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  dirBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dirText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  dirTextOn: { color: '#0f172a' },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  levelChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  levelChipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  frontTr: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginVertical: 3 },
  backHead: { alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  backHeadword: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  muteRow: { marginTop: 10, alignItems: 'center' },
  muteText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  muteTextOn: { color: colors.unknown },
  counter: { color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  cardArea: { flex: 1 },
  animatedCard: { flex: 1 },
  pressArea: { flex: 1 },
  face: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  faceBack: { alignItems: 'stretch', justifyContent: 'flex-start' },
  headword: { color: colors.text, fontSize: 34, fontWeight: '800', textAlign: 'center' },
  pron: { color: colors.primary, fontSize: 16, marginTop: 6 },
  pos: { color: colors.textMuted, fontStyle: 'italic', marginTop: 4, marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  tapHint: { color: colors.textMuted, marginTop: 20, fontSize: 12 },
  cardBack: { paddingVertical: 4 },
  meaningBlock: { marginBottom: 14 },
  meaningTr: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meaningEn: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  exampleEn: { color: colors.text, marginTop: 6, fontStyle: 'italic' },
  exampleTr: { color: colors.textMuted, marginTop: 2 },
  relLine: { color: colors.text, marginTop: 6 },
  relLabelSyn: { color: colors.active, fontWeight: '700' },
  relLabelAnt: { color: colors.unknown, fontWeight: '700' },
  tag: {
    position: 'absolute',
    top: 24,
    zIndex: 10,
    borderWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagKnow: { right: 20, borderColor: colors.active, transform: [{ rotate: '14deg' }] },
  tagDont: { left: 20, borderColor: colors.unknown, transform: [{ rotate: '-14deg' }] },
  tagKnowText: { color: colors.active, fontWeight: '900', fontSize: 18 },
  tagDontText: { color: colors.unknown, fontWeight: '900', fontSize: 18 },
  statusWrap: { marginTop: 14 },
  statusTitle: { color: colors.textMuted, marginBottom: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 6 },
  navBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  navKnow: { backgroundColor: colors.active },
  navText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  linkBtn: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
});
