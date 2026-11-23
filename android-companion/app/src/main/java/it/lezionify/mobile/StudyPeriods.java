package it.lezionify.mobile;

import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;

/** Reproject cached daily credits onto the current calendar without changing the cache. */
final class StudyPeriods {
    static long[] totals(LocalDate today, LocalDate[] dates, long[] seconds) {
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        long[] result = new long[3];
        for (int i = 0; i < dates.length; i++) {
            LocalDate date = dates[i];
            if (date.isAfter(today)) continue;
            if (date.equals(today)) result[0] += seconds[i];
            if (!date.isBefore(monday)) result[1] += seconds[i];
            if (date.getYear() == today.getYear() && date.getMonth() == today.getMonth()) result[2] += seconds[i];
        }
        return result;
    }
}
