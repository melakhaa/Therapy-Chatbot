import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import {
  apiGetAttention,
  apiGetDashboard,
  apiMarkAttentionRead,
} from '@prototype/api-client';
import {
  errorMessage,
  useAdminResource,
} from '@/hooks/useAdminResource';
import {
  OperationalMetric,
  SectionHeader,
  SignalCard,
} from '@/components/admin/OperationsUI';
import {
  AcademicMultiScopeControl,
  type AcademicMultiScope,
} from '@/components/admin/ProductPrimitives';
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  FilterControl,
  LoadingState,
  Notice,
  Page,
  Pagination,
  formatDate,
  ui,
} from '@/components/ui';
import { useAdminExperience } from '@/components/admin/AdminExperience';

export default function AttentionMonitoring() {
  const { language } = useAdminExperience();
  const isIndonesian = language === 'id';

  const [signal, setSignal] = useState('');
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<AcademicMultiScope>({
    facultyIds: [],
    academicUnitIds: [],
  });

  const loader = useCallback(
    () =>
      apiGetAttention({
        signal,
        unread_only: unread,
        page,
        faculty_ids: scope.facultyIds,
        academic_unit_ids: scope.academicUnitIds,
      }),
    [signal, unread, page, scope],
  );

  const resource = useAdminResource(loader);
  const dashboard = useAdminResource(apiGetDashboard);

  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const assessmentCount =
    resource.data?.summary.find(
      item => item.signal_type === 'assessment',
    )?.total || 0;

  const safetyCount =
    resource.data?.summary.find(
      item => item.signal_type === 'safety',
    )?.total || 0;

  const requestCount =
    resource.data?.summary.find(
      item => item.signal_type === 'request',
    )?.total || 0;

  const unreadCount =
    resource.data?.summary.reduce(
      (sum, item) => sum + item.unread,
      0,
    ) || 0;

  const markRead = async (logId: string) => {
    setBusy(logId);
    setError('');

    try {
      await apiMarkAttentionRead(logId);
      resource.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy('');
    }
  };

  return (
    <Page
      title={
        isIndonesian
          ? 'Pemantauan Risiko Tinggi'
          : 'High-Risk Monitoring'
      }
      subtitle={
        isIndonesian
          ? 'Pisahkan sinyal asesmen, permintaan kontak, dan peristiwa Safety Guardrail tanpa menampilkan konten pribadi.'
          : 'Separate assessment signals, contact requests, and Safety Guardrail events without exposing private content.'
      }
    >
      <Notice danger>
        {isIndonesian
          ? 'Hanya metadata operasional rahasia. Pesan chat, jurnal, teks pemicu guardrail, dan jawaban asesmen tidak pernah ditampilkan.'
          : 'Confidential operational metadata only. Raw chat messages, journals, guardrail trigger text, and assessment answers are never shown here.'}
      </Notice>

      <Card>
        <AcademicMultiScopeControl
          value={scope}
          onChange={value => {
            setScope(value);
            setPage(1);
          }}
          compact
        />
      </Card>

      <View style={ui.grid}>
        <OperationalMetric
          label={
            isIndonesian
              ? 'Sinyal asesmen'
              : 'Assessment signals'
          }
          value={assessmentCount}
          note={
            isIndonesian
              ? 'Peristiwa asesmen meningkat'
              : 'Elevated recorded assessment events'
          }
          icon="assignment-late"
          tone="amber"
        />

        <OperationalMetric
          label={
            isIndonesian
              ? 'Sinyal keselamatan'
              : 'Safety signals'
          }
          value={safetyCount}
          note="Safety Guardrail"
          icon="health-and-safety"
          tone="red"
        />

        <OperationalMetric
          label={
            isIndonesian
              ? 'Permintaan kontak'
              : 'Contact requests'
          }
          value={requestCount}
          note={
            isIndonesian
              ? 'Mahasiswa meminta tindak lanjut'
              : 'Students requesting follow-up'
          }
          icon="contact-support"
          tone="blue"
        />

        <OperationalMetric
          label={
            isIndonesian
              ? 'Sinyal belum dibaca'
              : 'Unread signals'
          }
          value={unreadCount}
          note={
            isIndonesian
              ? 'Antrean tinjauan admin'
              : 'Administrative review queue'
          }
          icon="mark-email-unread"
          tone="blue"
        />

        <OperationalMetric
          label={
            isIndonesian
              ? 'Hasil severe tercatat'
              : 'Recorded severe results'
          }
          value={
            dashboard.data?.severity_distribution.severe ?? '—'
          }
          note={
            isIndonesian
              ? 'Baris asesmen, bukan peristiwa krisis'
              : 'Assessment rows; not crisis events'
          }
          icon="monitor-heart"
          tone="purple"
        />
      </View>

      <Card>
        <SectionHeader
          title={
            isIndonesian
              ? 'Antrean perhatian'
              : 'Attention queue'
          }
          description={
            isIndonesian
              ? 'Filter berdasarkan sumber sinyal dan status tinjauan.'
              : 'Filter by signal source and review state.'
          }
        />

        <View style={ui.row}>
          <FilterControl
            label={
              isIndonesian
                ? 'Jenis sinyal'
                : 'Signal type'
            }
            value={signal}
            onChange={value => {
              setSignal(value);
              setPage(1);
            }}
            options={[
              {
                value: '',
                label: isIndonesian
                  ? 'Semua sinyal'
                  : 'All signals',
              },
              {
                value: 'assessment',
                label: isIndonesian
                  ? 'Sinyal asesmen'
                  : 'Assessment signal',
              },
              {
                value: 'safety',
                label: isIndonesian
                  ? 'Sinyal keselamatan'
                  : 'Safety signal',
              },
              {
                value: 'request',
                label: isIndonesian
                  ? 'Permintaan kontak'
                  : 'Contact request',
              },
            ]}
          />

          <FilterControl
            label={
              isIndonesian
                ? 'Status tinjauan'
                : 'Review state'
            }
            value={unread ? 'unread' : 'all'}
            onChange={value => {
              setUnread(value === 'unread');
              setPage(1);
            }}
            options={[
              {
                value: 'all',
                label: isIndonesian ? 'Semua' : 'All',
              },
              {
                value: 'unread',
                label: isIndonesian
                  ? 'Belum dibaca'
                  : 'Unread only',
              },
            ]}
          />

          <Button
            label={
              isIndonesian
                ? 'Muat ulang'
                : 'Refresh'
            }
            icon="refresh"
            tone="quiet"
            onPress={resource.reload}
          />
        </View>

        {error && <ErrorState message={error} />}

        {resource.loading ? (
          <LoadingState />
        ) : resource.error ? (
          <ErrorState
            message={resource.error}
            retry={resource.reload}
          />
        ) : (
          resource.data && (
            <>
              <DataTable
                rows={resource.data.signals}
                rowKey={item => item.log_id}
                columns={[
                  {
                    title: isIndonesian
                      ? 'Sinyal'
                      : 'Signal',
                    width: 220,
                    render: item => (
                      <View style={{ gap: 5 }}>
                        <Badge
                          value={
                            item.signal_type === 'safety'
                              ? 'Safety Guardrail'
                              : item.signal_type === 'request'
                                ? isIndonesian
                                  ? 'Permintaan kontak'
                                  : 'Contact request'
                                : isIndonesian
                                  ? 'Asesmen'
                                  : 'Assessment'
                          }
                        />

                        {item.signal_type ===
                          'assessment' && (
                          <Text style={ui.muted}>
                            {item.assessment_category_results
                              ?.map(
                                result =>
                                  `${result.category}: ${result.severity}`,
                              )
                              .join(' · ') ||
                              item.assessment_categories ||
                              (isIndonesian
                                ? 'Asesmen legacy / Stress-only'
                                : 'Legacy / Stress-only assessment')}
                          </Text>
                        )}
                      </View>
                    ),
                  },
                  {
                    title: isIndonesian
                      ? 'Mahasiswa / referensi'
                      : 'Student / reference',
                    width: 210,
                    render: item => (
                      <View>
                        <Text
                          style={[
                            ui.text,
                            { fontWeight: '700' },
                          ]}
                        >
                          {item.nama ||
                            (isIndonesian
                              ? 'Identitas tidak tersedia'
                              : 'Identity unavailable')}
                        </Text>
                        <Text style={ui.muted}>
                          {item.nim ||
                            item.user_id?.slice(0, 8) ||
                            (isIndonesian
                              ? 'Tidak ada pengguna terkait'
                              : 'No linked user')}
                        </Text>
                      </View>
                    ),
                  },
                  {
                    title: isIndonesian
                      ? 'Tercatat'
                      : 'Recorded',
                    width: 130,
                    render: item => (
                      <Text style={ui.muted}>
                        {formatDate(item.notified_at)}
                      </Text>
                    ),
                  },
                  {
                    title: isIndonesian
                      ? 'Status'
                      : 'State',
                    width: 110,
                    render: item => (
                      <Badge
                        value={
                          item.is_read
                            ? isIndonesian
                              ? 'ditinjau'
                              : 'reviewed'
                            : isIndonesian
                              ? 'belum dibaca'
                              : 'unread'
                        }
                      />
                    ),
                  },
                  {
                    title: isIndonesian
                      ? 'Tindakan'
                      : 'Actions',
                    width: 185,
                    render: item => (
                      <View style={ui.row}>
                        {item.user_id && (
                          <Button
                            label={
                              isIndonesian
                                ? 'Lihat mahasiswa'
                                : 'View student'
                            }
                            tone="quiet"
                            onPress={() =>
                              router.push(
                                (`/students/${item.user_id}`) as Href,
                              )
                            }
                          />
                        )}

                        {!item.is_read && (
                          <Button
                            label={
                              busy === item.log_id
                                ? isIndonesian
                                  ? 'Menyimpan…'
                                  : 'Saving…'
                                : isIndonesian
                                  ? 'Tandai ditinjau'
                                  : 'Mark reviewed'
                            }
                            disabled={Boolean(busy)}
                            tone="quiet"
                            onPress={() => {
                              void markRead(item.log_id);
                            }}
                          />
                        )}
                      </View>
                    ),
                  },
                ]}
              />

              <Pagination
                page={page}
                total={resource.data.total}
                onChange={setPage}
              />
            </>
          )
        )}
      </Card>

      <View style={ui.grid}>
        <View style={ui.column}>
          <Card
            title={
              isIndonesian
                ? 'Interpretasi sinyal'
                : 'Signal interpretation'
            }
          >
            <SignalCard
              type="assessment"
              title={
                isIndonesian
                  ? 'Sinyal asesmen DASS / legacy'
                  : 'DASS / legacy assessment signal'
              }
              detail={
                isIndonesian
                  ? 'DASS menampilkan Depression, Anxiety, dan Stress secara terpisah; asesmen lama tetap ditandai legacy/Stress-only.'
                  : 'DASS shows Depression, Anxiety, and Stress separately; older assessments remain marked legacy/Stress-only.'
              }
              meta={
                isIndonesian
                  ? 'Kategori adalah tingkat gejala dimensional, bukan diagnosis atau penilaian krisis.'
                  : 'Categories are dimensional symptom severity, not diagnoses or crisis determinations.'
              }
            />

            <SignalCard
              type="safety"
              title={
                isIndonesian
                  ? 'Sinyal keselamatan'
                  : 'Safety signal'
              }
              detail={
                isIndonesian
                  ? 'Safety Guardrail deterministik diaktifkan sebagai mekanisme terpisah.'
                  : 'The deterministic Safety Guardrail was activated as a separate mechanism.'
              }
              meta={
                isIndonesian
                  ? 'Konten pemicu sengaja disembunyikan dari dashboard.'
                  : 'Trigger content is intentionally hidden from this dashboard.'
              }
            />

            <Text style={ui.muted}>
              {isIndonesian
                ? 'Permintaan kontak menunjukkan bahwa mahasiswa meminta tindak lanjut melalui dialog keselamatan. Isi percakapan tetap tidak ditampilkan.'
                : 'A contact request indicates that a student requested follow-up through the safety dialog. Conversation content remains hidden.'}
            </Text>
          </Card>
        </View>

        <View style={ui.column}>
          <Card
            title={
              isIndonesian
                ? 'Batas respons administrator'
                : 'Administrator response boundary'
            }
          >
            <Text style={ui.text}>
              {isIndonesian
                ? 'Gunakan sinyal untuk memprioritaskan tindak lanjut operasional sesuai kebijakan kampus. Sajiwa tidak menyimpulkan diagnosis, keputusan perawatan, atau tingkat krisis dari tabel ini.'
                : 'Use these signals to prioritize operational follow-up under campus policy. Sajiwa does not infer clinical diagnoses, treatment decisions, or crisis severity from this table.'}
            </Text>
          </Card>
        </View>
      </View>
    </Page>
  );
}