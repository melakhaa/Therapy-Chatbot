import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Neu } from '@prototype/ui-shared';
import { BottomNav, FadeIn, NeuView, Button, ScreenHeader, IconButton } from '../components/ui';
import { apiGetJournals } from '@prototype/api-client';
import { moodOf } from '../constants/moods';

export default function JournalHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [journals, setJournals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchJournals();
    }, [])
  );

  const fetchJournals = async (loadMore = false) => {
    if (isFetchingMore || (!hasMore && loadMore)) return;

    if (loadMore) setIsFetchingMore(true);
    else setIsLoading(true);

    try {
      const currentOffset = loadMore ? journals.length : 0;
      const limit = 10;
      const data = await apiGetJournals(limit, currentOffset);
      const newJournals = data.journals || [];
      setJournals((prev) => (loadMore ? [...prev, ...newJournals] : newJournals));
      setHasMore(newJournals.length >= limit);
    } catch (e) {
      console.log('Failed to fetch journals', e);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const formatDate = (isoStr: string) =>
    new Date(isoStr).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  const renderItem = ({ item }: any) => {
    const mood = moodOf(item.mood);
    return (
      <FadeIn delay={0}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/journal-detail',
              params: {
                journal_id: item.journal_id,
                content: item.content,
                mood: item.mood,
                created_at: item.created_at,
              },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Jurnal ${formatDate(item.created_at)}${mood ? ', ' + mood.label : ''}`}
          style={({ pressed }) => [
            s.card,
            { backgroundColor: colors.background, boxShadow: pressed ? Neu.inset : Neu.raised },
          ]}
        >
          <View style={s.cardHeader}>
            <Text style={[s.dateText, { color: colors.onSurfaceVariant }]}>{formatDate(item.created_at)}</Text>
            {mood && (
              <View style={[s.moodBadge, { backgroundColor: colors.background, boxShadow: Neu.inset }]}>
                <Ionicons name={mood.icon} size={14} color={mood.color} />
                <Text style={[s.moodText, { color: mood.color }]}>{mood.label}</Text>
              </View>
            )}
          </View>
          <Text style={[s.contentText, { color: colors.onSurface }]} numberOfLines={3}>
            {item.content}
          </Text>
        </Pressable>
      </FadeIn>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={journals}
          keyExtractor={(item) => item.journal_id}
          contentContainerStyle={[s.listContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
          renderItem={renderItem}
          onEndReached={() => fetchJournals(true)}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <ScreenHeader
              title="Jurnal"
              subtitle="Catatan perjalanan perasaanmu."
              right={<IconButton icon="add" label="Tulis jurnal baru" color={colors.primary} onPress={() => router.push('/journal')} />}
            />
          }
          ListEmptyComponent={
            <NeuView inset radius={24} style={s.empty}>
              <Ionicons name="book-outline" size={40} color={colors.onSurfaceVariant} />
              <Text style={[s.emptyTitle, { color: colors.onSurface }]}>Belum ada jurnal</Text>
              <Text style={[s.emptyText, { color: colors.onSurfaceVariant }]}>
                Menulis beberapa kalimat saja sudah bisa membantu menjernihkan pikiran.
              </Text>
              <Button label="Tulis jurnal pertama" onPress={() => router.push('/journal')} style={{ alignSelf: 'stretch' }} />
            </NeuView>
          }
          ListFooterComponent={
            isFetchingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      <BottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, gap: 18 },

  empty: { alignItems: 'center', padding: 28, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', lineHeight: 21, marginBottom: 8 },

  card: { padding: 20, borderRadius: 22 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dateText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  moodText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  contentText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 23 },
});
