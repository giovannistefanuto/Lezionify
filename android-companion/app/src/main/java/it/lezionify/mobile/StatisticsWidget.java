package it.lezionify.mobile;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class StatisticsWidget extends AppWidgetProvider {
    static void display(Context context) {
        AppWidgetManager manager=AppWidgetManager.getInstance(context);
        int[] ids=manager.getAppWidgetIds(new ComponentName(context, StatisticsWidget.class));
        for (int id : ids) {
            RemoteViews views=new RemoteViews(context.getPackageName(), R.layout.widget);
            views.setTextViewText(R.id.widget_summary, StatisticsStore.summary(context));
            Intent refresh=new Intent(context, StatisticsWidget.class).setAction("it.lezionify.mobile.REFRESH");
            views.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(context, 0, refresh, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
            manager.updateAppWidget(id, views);
        }
    }
    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action=intent.getAction();
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action) || "it.lezionify.mobile.REFRESH".equals(action)) {
            display(context);
            PendingResult pending=goAsync();
            new Thread(() -> { try { StatisticsStore.refresh(context.getApplicationContext()); } catch(Exception ignored) {} finally { display(context); pending.finish(); } }).start();
        }
    }
}
