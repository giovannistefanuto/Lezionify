package it.lezionify.mobile;

import android.app.Activity;
import android.app.Instrumentation;
import android.appwidget.AppWidgetHost;
import android.appwidget.AppWidgetHostView;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;

/** Emulator-only instrumentation with synthetic cache; never shipped in the app. */
public class MemoWidgetTest extends Instrumentation {
    private void check(boolean value,String message) { if(!value) throw new AssertionError(message); }
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
    @Override public void onStart() {
        Bundle result=new Bundle();
        try {
            Context c=getTargetContext();
            String stream="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
            JSONObject data=new JSONObject().put("version",1).put("streamId",stream).put("revision",1)
                .put("generatedAt","2026-11-25T12:00:00Z").put("timeZone","Europe/Rome")
                .put("days",new JSONArray()).put("courses",new JSONArray().put(new JSONObject().put("code","Corso prova").put("remaining",7)));
            c.getSharedPreferences("mobile",0).edit().clear().putString("stream",stream).putString("snapshot",data.toString()).commit();
            check(MemoContent.read(c,99,0).rows.get(0).contains("Attiva"),"Old snapshot must remain compatible");
            check(StatisticsStore.readSnapshot(c).remaining==7,"Old statistics changed");
            JSONArray groups=new JSONArray().put(new JSONObject().put("id","").put("name","Senza tag").put("notes","Nota libera"))
                .put(new JSONObject().put("id","g").put("name","Università").put("notes","Nota del gruppo\nSeconda riga"));
            JSONArray todos=new JSONArray().put(new JSONObject().put("id","t1").put("groupId","g").put("text","Studiare algoritmi").put("completed",false))
                .put(new JSONObject().put("id","t2").put("groupId","g").put("text","Leggere appunti").put("completed",true));
            data.put("memo",new JSONObject().put("groups",groups).put("todos",todos));
            c.getSharedPreferences("mobile",0).edit().putString("snapshot",data.toString()).commit();
            MemoContent content=MemoContent.read(c,99,1);
            check(content.group.contains("Università"),"Group selection");
            check(content.rows.contains("○ Studiare algoritmi") && content.rows.contains("✓ Leggere appunti"),"Task states");
            check(content.rows.contains("Nota del gruppo\nSeconda riga"),"Complete notes");
            check(MemoContent.read(c,99,0).group.equals(content.group),"Selection persistence");
            check(MemoContent.read(c,100,0).group.startsWith("Senza tag"),"Widget selections must be independent");
            check(MemoContent.read(c,99,1).group.startsWith("Senza tag"),"Wrap groups");
            c.getSharedPreferences("memo-widgets",0).edit().putString("group-99","removed").commit();
            check(MemoContent.read(c,99,0).group.startsWith("Senza tag"),"Deleted group fallback");
            groups.remove(1);
            check(MemoContent.read(c,99,0).group.startsWith("Senza tag"),"Deleted group fallback");
            StringBuilder longNote=new StringBuilder();
            for(int i=0;i<4000;i++) longNote.append("😀");
            groups.getJSONObject(0).put("notes",longNote.toString());
            data.getJSONObject("memo").put("groups",groups).put("todos",new JSONArray());
            c.getSharedPreferences("mobile",0).edit().putString("snapshot",data.toString()).commit();
            MemoContent longContent=MemoContent.read(c,99,0);
            StringBuilder joined=new StringBuilder();
            for(int i=3;i<longContent.rows.size();i++) joined.append(longContent.rows.get(i));
            check(joined.toString().equals(longNote.toString()),"Long Unicode notes were truncated");
            groups.getJSONObject(0).put("notes","Nota libera");
            data.getJSONObject("memo").put("todos",todos);
            // Restore valid cache and exercise actual widget host rendering and PendingIntent actions.
            groups.put(new JSONObject().put("id","g").put("name","Università").put("notes","Nota del gruppo\nSeconda riga"));
            data.getJSONObject("memo").put("groups",groups);
            c.getSharedPreferences("mobile",0).edit().putString("snapshot",data.toString()).commit();
            HostActivity host=(HostActivity)startActivitySync(new Intent(c,HostActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            waitForIdleSync();
            runOnMainSync(() -> host.memo.findViewById(R.id.memo_next).performClick());
            Thread.sleep(1000); waitForIdleSync();
            check(MemoContent.read(c,host.memoId,0).group.contains("Università"),"Widget next PendingIntent");
            check(StatisticsStore.readSnapshot(c).remaining==7,"Memo must preserve statistics");
            // An offline update must leave the last valid cache intact.
            try { StatisticsStore.refresh(c); } catch(Exception expected) { }
            check(MemoContent.read(c,host.memoId,0).rows.contains("○ Studiare algoritmi"),"Offline cache lost");
            JSONArray many=new JSONArray();
            for(int i=0;i<80;i++) many.put(new JSONObject().put("id","many-"+i).put("groupId","g").put("text","Attività "+i).put("completed",false));
            data.getJSONObject("memo").put("todos",many);
            c.getSharedPreferences("mobile",0).edit().putString("snapshot",data.toString()).commit();
            runOnMainSync(() -> MemoWidget.update(c,host.memoId,0));
            Thread.sleep(500); waitForIdleSync();
            runOnMainSync(() -> host.memo.findViewById(R.id.memo_page_next).performClick());
            Thread.sleep(500); waitForIdleSync();
            check(c.getSharedPreferences("memo-widgets",0).getInt("page-"+host.memoId,0)==1,"Widget pagination PendingIntent");
            data.getJSONObject("memo").put("todos",todos);
            c.getSharedPreferences("mobile",0).edit().putString("snapshot",data.toString()).commit();
            runOnMainSync(() -> MemoWidget.update(c,host.memoId,0));
            Thread.sleep(700); waitForIdleSync();
            android.graphics.Bitmap screenshot=getUiAutomation().takeScreenshot();
            java.io.File file=new java.io.File(c.getExternalFilesDir(null),"memo-widget.png");
            try(java.io.FileOutputStream output=new java.io.FileOutputStream(file)) { screenshot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,output); }
            screenshot.recycle();
            result.putString("stream","Memo widget, tasks, notes, groups, legacy statistics and offline cache: PASS");
            finish(Activity.RESULT_OK,result);
        } catch(Throwable error) { result.putString("stream","FAIL: "+error.toString()); finish(Activity.RESULT_CANCELED,result); }
    }
    public static class HostActivity extends Activity {
        AppWidgetHost host; AppWidgetHostView memo; int memoId;
        @Override public void onCreate(Bundle state) {
            super.onCreate(state);
            host=new AppWidgetHost(this,20261125); host.startListening();
            LinearLayout layout=new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); layout.setPadding(20,30,20,20);
            AppWidgetManager manager=AppWidgetManager.getInstance(this);
            memoId=host.allocateAppWidgetId();
            if(!manager.bindAppWidgetIdIfAllowed(memoId,new ComponentName(this,MemoWidget.class))) throw new IllegalStateException("Grant widget binding to the emulator fixture");
            MemoWidget.update(this,memoId,0);
            memo=host.createView(this,memoId,manager.getAppWidgetInfo(memoId));
            layout.addView(memo,new LinearLayout.LayoutParams(-1,1000));
            int statsId=host.allocateAppWidgetId();
            if(!manager.bindAppWidgetIdIfAllowed(statsId,new ComponentName(this,StatisticsWidget.class))) throw new IllegalStateException("Statistics binding failed");
            StatisticsWidget.display(this);
            layout.addView(host.createView(this,statsId,manager.getAppWidgetInfo(statsId)),new LinearLayout.LayoutParams(-1,500));
            setContentView(layout);
        }
    }
}
