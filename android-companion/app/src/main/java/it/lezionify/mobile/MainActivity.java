package it.lezionify.mobile;

import android.app.Activity;
import android.os.Bundle;
import android.text.InputType;
import android.text.method.PasswordTransformationMethod;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class MainActivity extends Activity {
    private TextView summary, status;
    private EditText pairing;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout=new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); layout.setPadding(36,50,36,36);
        TextView title=new TextView(this); title.setText("Lezionify"); title.setTextSize(30); layout.addView(title);
        summary=new TextView(this); summary.setTextSize(17); summary.setPadding(0,24,0,24); layout.addView(summary);
        status=new TextView(this); layout.addView(status);
        Button memo=new Button(this); memo.setText("Memo · gruppi e note"); memo.setOnClickListener(v -> startActivity(new android.content.Intent(this, MemoActivity.class))); layout.addView(memo);
        Button update=new Button(this); update.setText("Aggiorna statistiche"); update.setOnClickListener(v -> refresh()); layout.addView(update);
        TextView help=new TextView(this); help.setText("Incolla il codice mostrato nelle impostazioni di Lezionify sul PC. Conservalo come una password."); help.setPadding(0,28,0,8); layout.addView(help);
        pairing=new EditText(this); pairing.setHint("Codice di abbinamento"); pairing.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD); pairing.setSingleLine(false); pairing.setTransformationMethod(PasswordTransformationMethod.getInstance()); pairing.setGravity(Gravity.TOP); layout.addView(pairing);
        Button connect=new Button(this); connect.setText("Collega");
        connect.setOnClickListener(v -> { try { StatisticsStore.pair(this, pairing.getText().toString()); pairing.setText(""); status.setText("Collegamento salvato."); refresh(); } catch(Exception e) { status.setText("Codice non valido."); } });
        layout.addView(connect);
        ScrollView scroll=new ScrollView(this); scroll.addView(layout); setContentView(scroll);
        show();
        if (!getSharedPreferences("mobile", MODE_PRIVATE).getString("url", "").isEmpty()) refresh();
    }
    private void show() { summary.setText(StatisticsStore.summary(this)); }
    private void refresh() {
        status.setText("Aggiornamento in corso…");
        new Thread(() -> {
            String message;
            try { StatisticsStore.refresh(getApplicationContext()); message="Aggiornamento completato."; }
            catch(Exception e) { message="Aggiornamento non riuscito. Riprova più tardi."; }
            String result=message;
            runOnUiThread(() -> { show(); status.setText(result); StatisticsWidget.display(this); MemoWidget.display(this); });
        }).start();
    }
}
