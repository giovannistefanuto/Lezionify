package it.lezionify.mobile;

import android.app.PendingIntent;
import android.app.AlarmManager;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.RelativeSizeSpan;
import android.util.SizeF;
import android.view.View;
import android.widget.RemoteViews;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.json.JSONObject;

public class StatisticsWidget extends AppWidgetProvider {
    private static final String REFRESH = "it.lezionify.mobile.REFRESH";
    private static final int MIN_WIDTH = 200;
    private static final int MIN_HEIGHT = 176;
    private static final int DETAILS_HEIGHT = 270;
    private static final int MAX_COURSES = 3;
    private static final int PENDING_FLAGS = PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT;
    private static final DateTimeFormatter SNAPSHOT_DATE = DateTimeFormatter.ofPattern("d MMM uuuu · HH:mm", Locale.ITALIAN);

    static void display(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, StatisticsWidget.class));
        if (ids.length == 0) return;

        StatisticsStore.Snapshot snapshot = StatisticsStore.readSnapshot(context);
        for (int id : ids) {
            update(context, manager, id, manager.getAppWidgetOptions(id), snapshot);
        }
    }

    private static void update(Context context, AppWidgetManager manager, int id, Bundle options,
                               StatisticsStore.Snapshot snapshot) {
        RemoteViews compact = render(context, snapshot, false);
        if (snapshot == null || snapshot.courses.length() == 0) {
            manager.updateAppWidget(id, compact);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Map<SizeF, RemoteViews> sizes = new LinkedHashMap<>();
            sizes.put(new SizeF(MIN_WIDTH, MIN_HEIGHT), compact);
            sizes.put(new SizeF(MIN_WIDTH, DETAILS_HEIGHT), render(context, snapshot, true));
            manager.updateAppWidget(id, new RemoteViews(sizes));
        } else {
            boolean tall = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT) >= DETAILS_HEIGHT;
            manager.updateAppWidget(id, tall ? render(context, snapshot, true) : compact);
        }
    }

    private static RemoteViews render(Context context, StatisticsStore.Snapshot snapshot, boolean tall) {
        String packageName = context.getPackageName();
        RemoteViews views = new RemoteViews(packageName, R.layout.widget);
        Intent refresh = new Intent(context, StatisticsWidget.class).setAction(REFRESH);
        Intent open = new Intent(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(context, 0, refresh, PENDING_FLAGS));
        views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 0, open, PENDING_FLAGS));
        views.setViewVisibility(R.id.widget_empty, snapshot == null ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_metrics, snapshot == null ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widget_courses, snapshot == null ? View.GONE : View.VISIBLE);
        views.removeAllViews(R.id.widget_course_rows);
        views.setViewVisibility(R.id.widget_more, View.GONE);
        if (snapshot == null) {
            views.setTextViewText(R.id.widget_footer, context.getString(R.string.widget_open));
            return views;
        }

        views.setTextViewText(R.id.widget_today, heroDuration(snapshot.today));
        views.setTextViewText(R.id.widget_week, duration(snapshot.week));
        views.setTextViewText(R.id.widget_month, duration(snapshot.month));
        views.setTextViewText(R.id.widget_total, context.getString(R.string.widget_total, snapshot.remaining));
        views.setTextViewText(R.id.widget_footer,
            context.getString(R.string.widget_snapshot_date, SNAPSHOT_DATE.format(snapshot.generated)));

        if (tall) {
            int count = Math.min(MAX_COURSES, snapshot.courses.length());
            int more = snapshot.courses.length() - count;
            if (more > 0) {
                views.setTextViewText(R.id.widget_more,
                    context.getResources().getQuantityString(R.plurals.widget_more_courses, more, more));
                views.setViewVisibility(R.id.widget_more, View.VISIBLE);
            }
            for (int i = 0; i < count; i++) {
                JSONObject course = snapshot.courses.optJSONObject(i);
                String name = course.optString("code");
                int remaining = course.optInt("remaining");
                RemoteViews row = new RemoteViews(packageName, R.layout.widget_course);
                row.setTextViewText(R.id.widget_course_name, name);
                row.setTextViewText(R.id.widget_course_remaining, Integer.toString(remaining));
                row.setContentDescription(R.id.widget_course,
                    context.getResources().getQuantityString(R.plurals.widget_course_description, remaining, name, remaining));
                views.addView(R.id.widget_course_rows, row);
            }
        }
        return views;
    }

    private static String duration(long seconds) {
        return String.format(Locale.ITALIAN, "%d h %02d min", seconds / 3600, (seconds % 3600) / 60);
    }

    private static CharSequence heroDuration(long seconds) {
        String text = duration(seconds);
        int hoursUnit = text.indexOf(" h ");
        int minutesUnit = text.indexOf(" min");
        SpannableStringBuilder styled = new SpannableStringBuilder(text);
        styled.setSpan(new RelativeSizeSpan(0.52f), hoursUnit, hoursUnit + 3, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        styled.setSpan(new RelativeSizeSpan(0.52f), minutesUnit, text.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        return styled;
    }

    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            update(context, manager, id, options, StatisticsStore.readSnapshot(context));
        }
    }

    private static final String ROLLOVER = "it.lezionify.mobile.CALENDAR_ROLLOVER";
    private static PendingIntent rolloverIntent(Context context) {
        return PendingIntent.getBroadcast(context, 1, new Intent(context, StatisticsWidget.class).setAction(ROLLOVER), PENDING_FLAGS);
    }
    private static void scheduleRollover(Context context) {
        StatisticsStore.Snapshot snapshot = StatisticsStore.readSnapshot(context);
        ZoneId zone = snapshot == null ? ZoneId.systemDefault() : snapshot.generated.getZone();
        long next = ZonedDateTime.now(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli();
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        alarms.set(AlarmManager.RTC, next, rolloverIntent(context));
    }
    @Override public void onDisabled(Context context) {
        ((AlarmManager)context.getSystemService(Context.ALARM_SERVICE)).cancel(rolloverIntent(context));
    }

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, StatisticsWidget.class));
        if (ids.length == 0) return;
        scheduleRollover(context);
        if (ROLLOVER.equals(action) || Intent.ACTION_DATE_CHANGED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            display(context);
            return;
        }
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action) || REFRESH.equals(action)) {
            display(context);
            PendingResult pending = goAsync();
            new Thread(() -> {
                try {
                    StatisticsStore.refresh(context.getApplicationContext());
                } catch (Exception ignored) {
                    // Keep the last valid snapshot visible when a refresh fails.
                } finally {
                    try {
                        display(context);
                    } finally {
                        pending.finish();
                    }
                }
            }).start();
        }
    }
}
