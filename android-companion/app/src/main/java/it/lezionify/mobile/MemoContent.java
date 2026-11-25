package it.lezionify.mobile;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

final class MemoContent {
    final List<String> rows = new ArrayList<>();
    String group = "Memo", footer = "Attiva la sincronizzazione Memo sul PC.";
    String selected = "";
    static MemoContent read(Context context, int widgetId, int direction) {
        MemoContent result = new MemoContent();
        JSONObject data = StatisticsStore.memoSnapshot(context);
        if (data == null || !data.has("memo")) { result.rows.add(result.footer); return result; }
        JSONObject memo = data.optJSONObject("memo");
        JSONArray groups = memo.optJSONArray("groups");
        String saved = context.getSharedPreferences("memo-widgets", Context.MODE_PRIVATE).getString("group-" + widgetId, "");
        int index = 0;
        for (int i=0; i<groups.length(); i++) if (saved.equals(groups.optJSONObject(i).optString("id"))) index=i;
        index = Math.floorMod(index + direction, groups.length());
        JSONObject group = groups.optJSONObject(index);
        result.selected = group.optString("id");
        context.getSharedPreferences("memo-widgets", Context.MODE_PRIVATE).edit().putString("group-" + widgetId, result.selected).apply();
        result.group = group.optString("name") + " · " + (index+1) + "/" + groups.length();
        JSONArray todos = memo.optJSONArray("todos");
        result.rows.add("COSE DA FARE");
        int count=0;
        for (int i=0; i<todos.length(); i++) {
            JSONObject todo = todos.optJSONObject(i);
            if (result.selected.equals(todo.optString("groupId"))) {
                result.rows.add((todo.optBoolean("completed") ? "✓ " : "○ ") + todo.optString("text")); count++;
            }
        }
        if (count == 0) result.rows.add("Nessuna attività");
        result.rows.add("NOTE");
        String notes = group.optString("notes");
        if (notes.isEmpty()) result.rows.add("Nessuna nota");
        // Bound each RemoteViews row while retaining every character of long notes.
        for (int start=0; start<notes.length();) {
            int end=Math.min(start+1500, notes.length());
            if (end<notes.length() && Character.isHighSurrogate(notes.charAt(end-1))) end--;
            result.rows.add(notes.substring(start,end)); start=end;
        }
        try {
            result.footer = "Dati del " + java.time.format.DateTimeFormatter.ofPattern("d MMM · HH:mm", java.util.Locale.ITALIAN)
                .format(java.time.Instant.parse(data.getString("generatedAt")).atZone(java.time.ZoneId.of(data.getString("timeZone")))) + " · Sola lettura";
        } catch (Exception ignored) { result.footer = "Ultima copia · Sola lettura"; }
        return result;
    }
}
