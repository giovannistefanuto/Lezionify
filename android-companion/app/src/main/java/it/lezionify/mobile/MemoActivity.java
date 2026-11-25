package it.lezionify.mobile;
import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
public class MemoActivity extends Activity {
    private int widgetId;
    @Override public void onCreate(Bundle state) { super.onCreate(state); widgetId=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,-1); show(0); }
    private void show(int direction) {
        MemoContent content=MemoContent.read(this,widgetId,direction);
        LinearLayout layout=new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); layout.setPadding(32,32,32,32);
        TextView title=new TextView(this); title.setText("Memo · "+content.group); title.setTextSize(24); layout.addView(title);
        LinearLayout navigation=new LinearLayout(this);
        Button previous=new Button(this); previous.setText("‹ Gruppo"); previous.setOnClickListener(v->show(-1)); navigation.addView(previous);
        Button next=new Button(this); next.setText("Gruppo ›"); next.setOnClickListener(v->show(1)); navigation.addView(next); layout.addView(navigation);
        for(String row:content.rows) { TextView text=new TextView(this); text.setText(row); text.setTextSize(17); text.setPadding(0,12,0,12); layout.addView(text); }
        TextView footer=new TextView(this); footer.setText(content.footer); layout.addView(footer);
        ScrollView scroll=new ScrollView(this); scroll.addView(layout); setContentView(scroll);
        MemoWidget.display(this);
    }
}
