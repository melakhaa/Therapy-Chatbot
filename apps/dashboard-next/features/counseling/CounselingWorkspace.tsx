'use client';

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ApiError } from '@/lib/api/client';
import { Badge, Button, Drawer, EmptyState, ErrorState, Icon, InlineAlert, Input, PageShell, Skeleton } from '@/components/ui';
import { assignCounselingRequest, createBlockedPeriod, deleteBlockedPeriod, getCounselingCalendar, getCounselingRequests, getCounselors, updateAppointment } from './api';
import { activeAvailability, addDays, deriveSessionStatus, filterAppointments, hasObviousConflict, jakartaDateKey, JAKARTA_TIME_ZONE, localSchedulePayload, normalizeRequests, weekRange, type SessionDisplayStatus } from './model';
import type { Appointment, AppointmentStatus, BlockedPeriod, CalendarResponse, Counselor, CounselingRequest, RequestResponse } from './types';
import type { Messages } from '@/lib/i18n/messages';

const REQUEST_PAGE_SIZE = 20;
type Tab = 'calendar' | 'requests' | 'availability' | 'exceptions';
type View = 'week' | 'list';
type CounselingCopy = Messages['counseling'];

export function CounselingWorkspace() {
  const { language, text } = useLanguage();
  const copy = text.counseling;
  const locale = language === 'id' ? 'id-ID' : 'en-GB';
  const [now, setNow] = useState(() => new Date());
  const [anchor, setAnchor] = useState(() => jakartaDateKey(new Date()));
  const [tab, setTab] = useState<Tab>('calendar');
  const [view, setView] = useState<View>('week');
  const [counselorId, setCounselorId] = useState('');
  const [status, setStatus] = useState<'' | AppointmentStatus>('');
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(false);
  const [counselorError, setCounselorError] = useState(false);
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [requests, setRequests] = useState<RequestResponse | null>(null);
  const [requestPage, setRequestPage] = useState(1);
  const [requestLoading, setRequestLoading] = useState(true);
  const [requestError, setRequestError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<CounselingRequest | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const range = useMemo(() => weekRange(anchor), [anchor]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void getCounselingCalendar(range.start, range.end, counselorId || undefined, controller.signal)
      .then((value) => { setCalendar(value); setCalendarError(false); })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setCalendarError(true); })
      .finally(() => { if (!controller.signal.aborted) setCalendarLoading(false); });
    return () => controller.abort();
  }, [range.start, range.end, counselorId, calendarVersion]);

  useEffect(() => {
    const controller = new AbortController();
    void getCounselors(controller.signal)
      .then((value) => { setCounselors(value.counselors); setCounselorError(false); })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setCounselorError(true); });
    return () => controller.abort();
  }, [calendarVersion]);

  useEffect(() => {
    const controller = new AbortController();
    void getCounselingRequests(requestPage, REQUEST_PAGE_SIZE, controller.signal)
      .then((value) => { setRequests({ ...value, requests: normalizeRequests(value) }); setRequestError(false); })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setRequestError(true); })
      .finally(() => { if (!controller.signal.aborted) setRequestLoading(false); });
    return () => controller.abort();
  }, [requestPage, requestVersion]);

  const refresh = useCallback(() => {
    setNow(new Date());
    setCalendarLoading(true);
    setRequestLoading(true);
    setCalendarVersion((value) => value + 1);
    setRequestVersion((value) => value + 1);
  }, []);
  const afterMutation = useCallback(() => {
    setSelectedRequest(null);
    setSelectedAppointment(null);
    setExceptionOpen(false);
    refresh();
  }, [refresh]);
  const appointments = useMemo(() => filterAppointments(calendar?.appointments ?? [], counselorId, status), [calendar, counselorId, status]);
  const today = jakartaDateKey(now);
  const todaySessions = range.days.includes(today) ? appointments.filter((item) => jakartaDateKey(new Date(item.starts_at)) === today && !['cancelled', 'no_show'].includes(item.status)).length : null;
  const activeCounselors = counselors.filter((item) => item.active).length;

  return <PageShell title={copy.title} actions={<Button variant="secondary" icon="refresh" onClick={refresh}>{copy.refresh}</Button>}>
    <div className="counseling-stack">
      <section className="counseling-metrics" aria-label={copy.metrics.label}>
        <ScheduleMetric icon="calendar" value={requestError ? '—' : requests?.total ?? '—'} label={copy.metrics.pending} />
        <ScheduleMetric icon="check" value={calendarError ? '—' : todaySessions ?? '—'} label={todaySessions === null ? copy.metrics.todayOutsideRange : copy.metrics.today} />
        <ScheduleMetric icon="counselor" value={counselorError ? '—' : activeCounselors} label={copy.metrics.counselors} />
        <ScheduleMetric icon="alert" value={calendarError ? '—' : calendar?.blocked_periods.length ?? '—'} label={copy.metrics.exceptions} />
      </section>

      <div className="workspace-tabs" role="tablist" aria-label={copy.tabs.label}>
        {(['calendar', 'requests', 'availability', 'exceptions'] as Tab[]).map((key) => <button key={key} role="tab" aria-selected={tab === key} aria-controls={`counseling-${key}`} id={`counseling-tab-${key}`} onClick={() => setTab(key)}>{copy.tabs[key]}</button>)}
      </div>

      <section id={`counseling-${tab}`} role="tabpanel" aria-labelledby={`counseling-tab-${tab}`} className="counseling-workspace">
        {tab === 'calendar' && <CalendarTab copy={copy} locale={locale} now={now} range={range} anchor={anchor} setAnchor={(value) => { setCalendarLoading(true); setAnchor(value); }} view={view} setView={setView} counselorId={counselorId} setCounselorId={(value) => { setCalendarLoading(true); setCounselorId(value); }} status={status} setStatus={setStatus} counselors={counselors} appointments={appointments} loading={calendarLoading} error={calendarError} retry={refresh} onOpen={setSelectedAppointment} />}
        {tab === 'requests' && <RequestsTab copy={copy} locale={locale} response={requests} loading={requestLoading} error={requestError} page={requestPage} setPage={(value) => { setRequestLoading(true); setRequestPage(value); }} retry={refresh} onAssign={setSelectedRequest} />}
        {tab === 'availability' && <AvailabilityTab copy={copy} locale={locale} calendar={calendar} counselors={counselors} loading={calendarLoading} error={calendarError} retry={refresh} />}
        {tab === 'exceptions' && <ExceptionsTab copy={copy} locale={locale} blocks={calendar?.blocked_periods ?? []} loading={calendarLoading} error={calendarError} retry={refresh} onCreate={() => setExceptionOpen(true)} onDeleted={afterMutation} />}
      </section>
    </div>
    <ScheduleDrawer key={selectedRequest?.counseling_request_id ?? selectedAppointment?.appointment_id ?? 'closed'} request={selectedRequest} appointment={selectedAppointment} counselors={counselors.filter((item) => item.active)} calendar={calendar} copy={copy} onClose={() => { setSelectedRequest(null); setSelectedAppointment(null); }} onSaved={afterMutation} />
    <ExceptionDrawer open={exceptionOpen} counselors={counselors.filter((item) => item.active)} copy={copy} onClose={() => setExceptionOpen(false)} onSaved={afterMutation} />
  </PageShell>;
}

function ScheduleMetric({ icon, value, label }: { icon: 'calendar' | 'check' | 'counselor' | 'alert'; value: number | string; label: string }) {
  return <article className="schedule-metric"><span><Icon name={icon} /></span><div><strong>{value}</strong><p>{label}</p></div></article>;
}

interface CalendarTabProps { copy: CounselingCopy; locale: string; now: Date; range: ReturnType<typeof weekRange>; anchor: string; setAnchor: (value: string) => void; view: View; setView: Dispatch<SetStateAction<View>>; counselorId: string; setCounselorId: (value: string) => void; status: '' | AppointmentStatus; setStatus: Dispatch<SetStateAction<'' | AppointmentStatus>>; counselors: Counselor[]; appointments: Appointment[]; loading: boolean; error: boolean; retry: () => void; onOpen: (item: Appointment) => void }
function CalendarTab({ copy, locale, now, range, anchor, setAnchor, view, setView, counselorId, setCounselorId, status, setStatus, counselors, appointments, loading, error, retry, onOpen }: CalendarTabProps) {
  return <>
    <div className="calendar-toolbar">
      <div className="calendar-navigation"><Button variant="ghost" onClick={() => setAnchor(addDays(anchor, -7))}>{copy.calendar.previous}</Button><Button variant="secondary" onClick={() => setAnchor(jakartaDateKey(new Date()))}>{copy.calendar.today}</Button><Button variant="ghost" onClick={() => setAnchor(addDays(anchor, 7))}>{copy.calendar.next}</Button><strong>{formatDateRange(range.start, range.end, locale)}</strong></div>
      <div className="calendar-controls">
        <label>{copy.filters.counselor}<select value={counselorId} onChange={(event) => setCounselorId(event.target.value)}><option value="">{copy.filters.allCounselors}</option>{counselors.filter((item: Counselor) => item.active).map((item: Counselor) => <option key={item.user_id} value={item.user_id}>{item.nama}</option>)}</select></label>
        <label>{copy.filters.status}<select value={status} onChange={(event) => setStatus(event.target.value as '' | AppointmentStatus)}><option value="">{copy.filters.allStatuses}</option>{(['confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'] as AppointmentStatus[]).map((item) => <option value={item} key={item}>{copy.status.backend[item]}</option>)}</select></label>
        <div className="segmented-control" aria-label={copy.calendar.view}><button aria-pressed={view === 'week'} onClick={() => setView('week')}>{copy.calendar.week}</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}>{copy.calendar.list}</button></div>
      </div>
    </div>
    {loading ? <CalendarSkeleton /> : error ? <ErrorState title={copy.errors.calendarTitle} message={copy.errors.calendar} retry={retry} /> : appointments.length === 0 ? <EmptyState title={copy.empty.calendar} /> : view === 'week' ? <WeekCalendar days={range.days} appointments={appointments} now={now} locale={locale} copy={copy} onOpen={onOpen} /> : <AppointmentList appointments={appointments} now={now} locale={locale} copy={copy} onOpen={onOpen} />}
  </>;
}

function WeekCalendar({ days, appointments, now, locale, copy, onOpen }: { days: string[]; appointments: Appointment[]; now: Date; locale: string; copy: CounselingCopy; onOpen: (item: Appointment) => void }) {
  const today = jakartaDateKey(now);
  return <div className="week-calendar" aria-label={copy.calendar.week} tabIndex={0}>{days.map((day) => {
    const rows = appointments.filter((item) => jakartaDateKey(new Date(item.starts_at)) === day);
    return <section className={`calendar-day ${day === today ? 'calendar-day-today' : ''}`} key={day}><header><span>{formatWeekday(day, locale)}</span><strong>{formatDay(day, locale)}</strong>{day === today && <small className="now-marker">{copy.calendar.now} {formatTime(now.toISOString(), locale)}</small>}</header><div className="calendar-day-events">{rows.length === 0 ? <span className="calendar-day-empty">—</span> : rows.map((item) => <AppointmentButton key={item.appointment_id} item={item} now={now} locale={locale} copy={copy} onOpen={onOpen} />)}</div></section>;
  })}</div>;
}

function AppointmentButton({ item, now, locale, copy, onOpen }: { item: Appointment; now: Date; locale: string; copy: CounselingCopy; onOpen: (item: Appointment) => void }) {
  const status = deriveSessionStatus(item, now);
  return <button className={`calendar-event event-${status}`} onClick={() => onOpen(item)} aria-label={`${item.student_name}, ${formatTimeRange(item.starts_at, item.ends_at, locale)}, ${copy.status.display[status]}`}><strong>{item.student_name}</strong><span>{formatTimeRange(item.starts_at, item.ends_at, locale)}</span><small>{item.counselor_name}</small><Badge tone={statusTone(status)}>{copy.status.display[status]}</Badge></button>;
}

function AppointmentList({ appointments, now, locale, copy, onOpen }: { appointments: Appointment[]; now: Date; locale: string; copy: CounselingCopy; onOpen: (item: Appointment) => void }) {
  return <div className="operations-table-wrap"><table className="operations-table counseling-list"><thead><tr><th>{copy.fields.date}</th><th>{copy.fields.time}</th><th>{copy.fields.student}</th><th>{copy.fields.counselor}</th><th>{copy.fields.status}</th><th>{copy.fields.action}</th></tr></thead><tbody>{appointments.map((item) => { const status = deriveSessionStatus(item, now); return <tr key={item.appointment_id}><td>{formatDate(item.starts_at, locale)}</td><td>{formatTimeRange(item.starts_at, item.ends_at, locale)}</td><td><strong>{item.student_name}</strong><small>{item.nim ?? copy.unavailable}</small></td><td>{item.counselor_name}</td><td><Badge tone={statusTone(status)}>{copy.status.display[status]}</Badge></td><td><Button variant="secondary" onClick={() => onOpen(item)}>{copy.actions.view}</Button></td></tr>; })}</tbody></table></div>;
}

interface RequestsTabProps { copy: CounselingCopy; locale: string; response: RequestResponse | null; loading: boolean; error: boolean; page: number; setPage: (value: number) => void; retry: () => void; onAssign: (item: CounselingRequest) => void }
function RequestsTab({ copy, locale, response, loading, error, page, setPage, retry, onAssign }: RequestsTabProps) {
  const pages = Math.max(1, Math.ceil((response?.total ?? 0) / REQUEST_PAGE_SIZE));
  if (loading && !response) return <ListSkeleton />;
  if (error) return <ErrorState title={copy.errors.requestsTitle} message={copy.errors.requests} retry={retry} />;
  if (!response?.requests.length) return <EmptyState title={copy.empty.requests} />;
  return <><div className="operations-table-wrap"><table className="operations-table request-table"><thead><tr><th>{copy.fields.student}</th><th>{copy.fields.academic}</th><th>{copy.fields.submitted}</th><th>{copy.fields.status}</th><th>{copy.fields.action}</th></tr></thead><tbody>{response.requests.map((item) => <tr key={item.counseling_request_id}><td><strong>{item.nama}</strong><small>{item.nim ?? copy.unavailable}</small></td><td><span>{item.faculty_name ?? copy.unavailable}</span><small>{item.academic_unit_name ?? copy.unavailable}</small></td><td>{formatDateTime(item.created_at, locale)}</td><td><Badge tone="warning">{copy.status.requested}</Badge></td><td><Button onClick={() => onAssign(item)}>{copy.actions.schedule}</Button></td></tr>)}</tbody></table></div><footer className="table-footer"><p>{copy.pagination.showing} {(page - 1) * REQUEST_PAGE_SIZE + 1}–{Math.min(page * REQUEST_PAGE_SIZE, response.total)} {copy.pagination.of} {response.total}</p><div className="pagination"><Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>{copy.calendar.previous}</Button><span>{copy.pagination.page} {page} / {pages}</span><Button variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>{copy.calendar.next}</Button></div></footer></>;
}

interface AvailabilityTabProps { copy: CounselingCopy; locale: string; calendar: CalendarResponse | null; counselors: Counselor[]; loading: boolean; error: boolean; retry: () => void }
function AvailabilityTab({ copy, locale, calendar, counselors, loading, error, retry }: AvailabilityTabProps) {
  if (loading && !calendar) return <ListSkeleton />;
  if (error) return <ErrorState title={copy.errors.availabilityTitle} message={copy.errors.availability} retry={retry} />;
  const rules = activeAvailability(calendar?.availability ?? []);
  if (!rules.length) return <EmptyState title={copy.empty.availability} />;
  return <div className="availability-grid">{counselors.filter((person: Counselor) => rules.some((rule) => rule.counselor_id === person.user_id)).map((person: Counselor) => <article className="availability-card" key={person.user_id}><header><span className="avatar-small">{initials(person.nama)}</span><div><h2>{person.nama}</h2>{person.title && <p>{person.title}</p>}</div></header><ul>{rules.filter((rule) => rule.counselor_id === person.user_id).map((rule) => <li key={rule.availability_rule_id}><strong>{weekdayName(rule.day_of_week, locale)}</strong><span>{shortTime(rule.start_time)}–{shortTime(rule.end_time)}</span><small>{rule.timezone}</small></li>)}</ul></article>)}</div>;
}

interface ExceptionsTabProps { copy: CounselingCopy; locale: string; blocks: BlockedPeriod[]; loading: boolean; error: boolean; retry: () => void; onCreate: () => void; onDeleted: () => void }
function ExceptionsTab({ copy, locale, blocks, loading, error, retry, onCreate, onDeleted }: ExceptionsTabProps) {
  const [deleting, setDeleting] = useState('');
  const [actionError, setActionError] = useState(false);
  const remove = async (item: BlockedPeriod) => { if (!window.confirm(copy.exceptions.confirmDelete)) return; setDeleting(item.blocked_period_id); setActionError(false); try { await deleteBlockedPeriod(item.blocked_period_id); onDeleted(); } catch { setActionError(true); } finally { setDeleting(''); } };
  if (loading && !blocks.length) return <ListSkeleton />;
  if (error) return <ErrorState title={copy.errors.exceptionsTitle} message={copy.errors.exceptions} retry={retry} />;
  return <><div className="section-actions"><p>{copy.exceptions.scope}</p><Button onClick={onCreate}>{copy.actions.addException}</Button></div>{actionError && <InlineAlert tone="danger">{copy.errors.mutation}</InlineAlert>}{blocks.length === 0 ? <EmptyState title={copy.empty.exceptions} action={<Button onClick={onCreate}>{copy.actions.addException}</Button>} /> : <div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>{copy.fields.counselor}</th><th>{copy.fields.date}</th><th>{copy.fields.time}</th><th>{copy.fields.reason}</th><th>{copy.fields.action}</th></tr></thead><tbody>{blocks.map((item: BlockedPeriod) => <tr key={item.blocked_period_id}><td>{item.counselor_name}</td><td>{formatDate(item.starts_at, locale)}</td><td>{formatTimeRange(item.starts_at, item.ends_at, locale)}</td><td>{item.reason ?? copy.unavailable}</td><td><Button variant="danger" loading={deleting === item.blocked_period_id} onClick={() => { void remove(item); }}>{copy.actions.removeException}</Button></td></tr>)}</tbody></table></div>}</>;
}

function ScheduleDrawer({ request, appointment, counselors, calendar, copy, onClose, onSaved }: { request: CounselingRequest | null; appointment: Appointment | null; counselors: Counselor[]; calendar: CalendarResponse | null; copy: CounselingCopy; onClose: () => void; onSaved: () => void }) {
  const current = request ?? appointment;
  const canEdit = !!request || !!appointment && ['confirmed', 'rescheduled'].includes(appointment.status);
  const [counselor, setCounselor] = useState(appointment?.counselor_id ?? ''); const [date, setDate] = useState(appointment ? jakartaDateKey(new Date(appointment.starts_at)) : ''); const [start, setStart] = useState(appointment ? inputTime(appointment.starts_at) : ''); const [end, setEnd] = useState(appointment ? inputTime(appointment.ends_at) : ''); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [confirmCancel, setConfirmCancel] = useState(false);
  const save = async () => { const payload = localSchedulePayload(counselor, date, start, end); if (!payload) { setError(copy.drawer.invalid); return; } if (hasObviousConflict(payload, calendar?.appointments ?? [], calendar?.blocked_periods ?? [], appointment?.appointment_id, request?.student_id ?? appointment?.student_id)) { setError(copy.drawer.conflict); return; } setSaving(true); setError(''); try { if (request) await assignCounselingRequest(request.counseling_request_id, payload); else if (appointment) await updateAppointment(appointment.appointment_id, payload); onSaved(); } catch (caught) { setError(caught instanceof ApiError && caught.status === 409 ? copy.drawer.conflict : copy.errors.mutation); } finally { setSaving(false); } };
  const cancel = async () => { if (!appointment) return; setSaving(true); setError(''); try { await updateAppointment(appointment.appointment_id, { status: 'cancelled' }); onSaved(); } catch { setError(copy.errors.mutation); } finally { setSaving(false); } };
  return <Drawer open={!!current} onOpenChange={(open) => { if (!open) onClose(); }} title={request ? copy.drawer.assignTitle : copy.drawer.detailTitle} description={request?.nama ?? appointment?.student_name} closeLabel={copy.actions.close} footer={<div className="drawer-actions"><Button variant="secondary" onClick={onClose}>{copy.actions.close}</Button>{canEdit && <Button loading={saving} onClick={() => { void save(); }}>{request ? copy.actions.assign : copy.actions.reschedule}</Button>}</div>}>
    {current && <div className="schedule-form"><div className="drawer-summary"><strong>{request?.nama ?? appointment?.student_name}</strong><span>{request?.nim ?? appointment?.nim ?? copy.unavailable}</span>{appointment && <Badge tone={statusTone(deriveSessionStatus(appointment, new Date()))}>{copy.status.display[deriveSessionStatus(appointment, new Date())]}</Badge>}</div>{error && <InlineAlert tone="danger">{error}</InlineAlert>}<label>{copy.fields.counselor}<select value={counselor} disabled={!canEdit} onChange={(event) => setCounselor(event.target.value)}><option value="">{copy.drawer.chooseCounselor}</option>{counselors.map((item) => <option value={item.user_id} key={item.user_id}>{item.nama}</option>)}</select></label><Input label={copy.fields.date} type="date" disabled={!canEdit} value={date} onChange={(event) => setDate(event.target.value)} /><div className="time-fields"><Input label={copy.drawer.start} type="time" disabled={!canEdit} value={start} onChange={(event) => setStart(event.target.value)} /><Input label={copy.drawer.end} type="time" disabled={!canEdit} value={end} onChange={(event) => setEnd(event.target.value)} /></div>{canEdit && <InlineAlert>{copy.drawer.noSlots}</InlineAlert>}{appointment && canEdit && <div className="cancel-zone">{confirmCancel ? <><p>{copy.drawer.cancelConfirm}</p><Button variant="danger" loading={saving} onClick={() => { void cancel(); }}>{copy.actions.confirmCancel}</Button><Button variant="ghost" onClick={() => setConfirmCancel(false)}>{copy.actions.keep}</Button></> : <Button variant="danger" onClick={() => setConfirmCancel(true)}>{copy.actions.cancel}</Button>}</div>}</div>}
  </Drawer>;
}

function ExceptionDrawer({ open, counselors, copy, onClose, onSaved }: { open: boolean; counselors: Counselor[]; copy: CounselingCopy; onClose: () => void; onSaved: () => void }) {
  const [counselor, setCounselor] = useState(''); const [date, setDate] = useState(''); const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const save = async () => { const payload = localSchedulePayload(counselor, date, start, end); if (!payload) { setError(copy.drawer.invalid); return; } setSaving(true); setError(''); try { await createBlockedPeriod({ ...payload, reason: reason.trim() || undefined }); onSaved(); } catch (caught) { setError(caught instanceof ApiError && caught.status === 409 ? copy.drawer.exceptionConflict : copy.errors.mutation); } finally { setSaving(false); } };
  return <Drawer open={open} onOpenChange={(value) => { if (!value) onClose(); }} title={copy.exceptions.createTitle} description={copy.exceptions.createDescription} closeLabel={copy.actions.close} footer={<div className="drawer-actions"><Button variant="secondary" onClick={onClose}>{copy.actions.close}</Button><Button loading={saving} onClick={() => { void save(); }}>{copy.actions.saveException}</Button></div>}><div className="schedule-form">{error && <InlineAlert tone="danger">{error}</InlineAlert>}<label>{copy.fields.counselor}<select value={counselor} onChange={(event) => setCounselor(event.target.value)}><option value="">{copy.drawer.chooseCounselor}</option>{counselors.map((item) => <option value={item.user_id} key={item.user_id}>{item.nama}</option>)}</select></label><Input label={copy.fields.date} type="date" value={date} onChange={(event) => setDate(event.target.value)} /><div className="time-fields"><Input label={copy.drawer.start} type="time" value={start} onChange={(event) => setStart(event.target.value)} /><Input label={copy.drawer.end} type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></div><Input label={copy.fields.reason} value={reason} maxLength={250} onChange={(event) => setReason(event.target.value)} /></div></Drawer>;
}

function CalendarSkeleton() { return <div className="week-calendar" aria-busy="true">{Array.from({ length: 7 }, (_, index) => <section className="calendar-day" key={index}><Skeleton lines={4} /></section>)}</div>; }
function ListSkeleton() { return <div className="loading-panel" aria-busy="true"><Skeleton lines={7} /></div>; }
function statusTone(status: SessionDisplayStatus): 'success' | 'danger' | 'info' | 'neutral' { return status === 'ongoing' ? 'success' : status === 'cancelled' || status === 'no_show' ? 'danger' : status === 'scheduled' ? 'info' : 'neutral'; }
function formatDateRange(start: string, end: string, locale: string) { const f = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }); return `${f.format(new Date(`${start}T12:00:00Z`))} – ${f.format(new Date(`${end}T12:00:00Z`))}`; }
function formatWeekday(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }).format(new Date(`${value}T12:00:00Z`)); }
function formatDay(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00Z`)); }
function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { timeZone: JAKARTA_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }
function formatDateTime(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { timeZone: JAKARTA_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatTime(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { timeZone: JAKARTA_TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatTimeRange(start: string, end: string, locale: string) { return `${formatTime(start, locale)}–${formatTime(end, locale)}`; }
function inputTime(value: string) { const parts = new Intl.DateTimeFormat('en-GB', { timeZone: JAKARTA_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)); return `${parts.find((part) => part.type === 'hour')?.value ?? ''}:${parts.find((part) => part.type === 'minute')?.value ?? ''}`; }
function shortTime(value: string) { return value.slice(0, 5); }
function weekdayName(day: number, locale: string) { const base = new Date(Date.UTC(2026, 0, 4 + day)); return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long' }).format(base); }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
