package it.lezionify.mobile;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
public class MemoListService extends RemoteViewsService {
    @Override public RemoteViewsFactory onGetViewFactory(Intent intent) {
        final int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,-1);
        return new RemoteViewsFactory() {
            private MemoContent content;
            private int start;
            public void onCreate() { onDataSetChanged(); }
            public void onDataSetChanged() { content=MemoContent.read(getApplicationContext(),id,0); start=getSharedPreferences("memo-widgets",MODE_PRIVATE).getInt("page-"+id,0)*25; }
            public void onDestroy() { }
            public int getCount() { return content==null?0:Math.min(25,content.rows.size()-start); }
            public RemoteViews getViewAt(int position) {
                if(content==null || position<0 || position>=getCount()) return null;
                RemoteViews row=new RemoteViews(getPackageName(),R.layout.memo_row);
                row.setTextViewText(R.id.memo_text,content.rows.get(start+position)); return row;
            }
            public RemoteViews getLoadingView() { return null; }
            public int getViewTypeCount() { return 1; }
            public long getItemId(int position) { return position; }
            public boolean hasStableIds() { return false; }
        };
    }
}
