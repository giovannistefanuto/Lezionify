package it.lezionify.mobile;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

public class MemoWidget extends AppWidgetProvider {
    private static final String PREFIX = "it.lezionify.mobile.MEMO_";
    static void display(Context c) {
        AppWidgetManager manager=AppWidgetManager.getInstance(c);
        for (int id : manager.getAppWidgetIds(new ComponentName(c, MemoWidget.class))) update(c, id, 0);
    }
    private static PendingIntent action(Context c, int id, String action) {
        Intent intent=new Intent(c, MemoWidget.class).setAction(PREFIX+action).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id)
            .setData(Uri.parse("lezionify://memo/"+id+"/"+action));
        return PendingIntent.getBroadcast(c, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void update(Context c, int id, int direction) {
        MemoContent content=MemoContent.read(c,id,direction);
        android.content.SharedPreferences prefs=c.getSharedPreferences("memo-widgets",Context.MODE_PRIVATE);
        int pages=Math.max(1,(content.rows.size()+24)/25);
        int page=Math.floorMod(direction==0?prefs.getInt("page-"+id,0):0,pages);
        prefs.edit().putInt("page-"+id,page).apply();
        int start=page*25, end=Math.min(start+25,content.rows.size());
        RemoteViews views=new RemoteViews(c.getPackageName(),R.layout.memo_widget);
        views.setTextViewText(R.id.memo_group,content.group);
        views.setTextViewText(R.id.memo_footer,content.footer);
        views.setTextViewText(R.id.memo_page,(page+1)+" / "+pages);
        views.setViewVisibility(R.id.memo_pages,pages>1?android.view.View.VISIBLE:android.view.View.GONE);
        views.setOnClickPendingIntent(R.id.memo_page_previous,action(c,id,"PAGE_PREVIOUS"));
        views.setOnClickPendingIntent(R.id.memo_page_next,action(c,id,"PAGE_NEXT"));
        views.setOnClickPendingIntent(R.id.memo_previous,action(c,id,"PREVIOUS"));
        views.setOnClickPendingIntent(R.id.memo_next,action(c,id,"NEXT"));
        views.setOnClickPendingIntent(R.id.memo_refresh,action(c,id,"REFRESH"));
        Intent open = new Intent(c, MemoActivity.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id)
            .setData(Uri.parse("lezionify://memo/"+id));
        views.setOnClickPendingIntent(R.id.memo_open,PendingIntent.getActivity(c,id,open,PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        if (Build.VERSION.SDK_INT >= 31) {
            RemoteViews.RemoteCollectionItems.Builder items = new RemoteViews.RemoteCollectionItems.Builder().setViewTypeCount(1);
            for (int i=start;i<end;i++) {
                RemoteViews row=new RemoteViews(c.getPackageName(),R.layout.memo_row);
                row.setTextViewText(R.id.memo_text,content.rows.get(i)); items.addItem(i,row);
            }
            views.setRemoteAdapter(R.id.memo_list,items.build());
        } else {
            Intent service=new Intent(c,MemoListService.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id);
            service.setData(Uri.parse("lezionify://memo-list/"+id)); views.setRemoteAdapter(R.id.memo_list,service);
        }
        AppWidgetManager manager=AppWidgetManager.getInstance(c);
        manager.updateAppWidget(id,views);
        if (Build.VERSION.SDK_INT < 31) manager.notifyAppWidgetViewDataChanged(id,R.id.memo_list);
    }
    @Override public void onReceive(Context c,Intent intent) {
        super.onReceive(c,intent);
        String action=intent.getAction();
        if (action == null || !action.startsWith(PREFIX)) return;
        int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,-1);
        boolean owned=false;
        for (int candidate: AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c,MemoWidget.class))) if(candidate==id) owned=true;
        if (!owned) return;
        if (action.equals(PREFIX+"PAGE_NEXT") || action.equals(PREFIX+"PAGE_PREVIOUS")) {
            android.content.SharedPreferences prefs=c.getSharedPreferences("memo-widgets",Context.MODE_PRIVATE);
            int page=prefs.getInt("page-"+id,0)+(action.endsWith("PAGE_NEXT")?1:-1);
            prefs.edit().putInt("page-"+id,page).apply(); update(c,id,0);
        }
        if (action.equals(PREFIX+"NEXT") || action.equals(PREFIX+"PREVIOUS")) update(c,id,action.endsWith("NEXT")?1:-1);
        if (action.equals(PREFIX+"REFRESH")) refresh(c);
    }
    private void refresh(Context c) {
        PendingResult result=goAsync();
        new Thread(() -> { try { StatisticsStore.refresh(c.getApplicationContext()); } catch(Exception ignored) { }
            finally { try { display(c); StatisticsWidget.display(c); } finally { result.finish(); } } }).start();
    }
    @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids) { display(c); refresh(c); }
    @Override public void onDeleted(Context c,int[] ids) {
        android.content.SharedPreferences.Editor editor=c.getSharedPreferences("memo-widgets",Context.MODE_PRIVATE).edit();
        for(int id:ids) editor.remove("group-"+id).remove("page-"+id); editor.apply();
    }
}
