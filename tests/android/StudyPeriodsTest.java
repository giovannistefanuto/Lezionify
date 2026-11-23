package it.lezionify.mobile;

import java.time.LocalDate;
import java.util.Arrays;

public class StudyPeriodsTest {
    private static void check(String now, String[] dates, long[] seconds, long... expected) {
        LocalDate[] parsed = Arrays.stream(dates).map(LocalDate::parse).toArray(LocalDate[]::new);
        long[] actual = StudyPeriods.totals(LocalDate.parse(now), parsed, seconds);
        if (!Arrays.equals(actual, expected)) throw new AssertionError(now + ": " + Arrays.toString(actual));
    }
    public static void main(String[] args) {
        check("2026-11-20", new String[]{"2026-11-20"}, new long[]{600}, 600, 600, 600);
        check("2026-11-21", new String[]{"2026-11-20"}, new long[]{600}, 0, 600, 600);
        check("2026-11-23", new String[]{"2026-11-20"}, new long[]{600}, 0, 0, 600);
        check("2026-12-01", new String[]{"2026-11-30"}, new long[]{600}, 0, 600, 0);
        check("2027-01-01", new String[]{"2026-12-31"}, new long[]{600}, 0, 600, 0);
        check("2027-01-04", new String[]{"2026-12-31"}, new long[]{600}, 0, 0, 0);
        check("2026-10-26", new String[]{"2026-10-25", "2026-10-26", "2026-10-27"}, new long[]{900, 600, 300}, 600, 600, 1500);
        check("2026-11-23", new String[]{}, new long[]{}, 0, 0, 0);
        System.out.println("PASS StudyPeriods: day, Monday, month, year, DST dates, future data and empty cache");
    }
}
