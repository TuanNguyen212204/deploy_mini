package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Logic thuần trending: eligibility, giảm giá từ lịch sử, chấm điểm & giải thích (gom một file).
 */
public final class TrendingDealEngine {

    // Ưu tiên popularityScore (Product) làm trọng số chính thay cho trustScore cũ từ bảng Signal.
    private static final double W_DISCOUNT = 0.45;
    private static final double W_POP = 0.25;
    private static final double W_TREND = 0.20;
    private static final double W_TRUST = 0.05;
    private static final double W_FRESH = 0.05;

    private TrendingDealEngine() {
    }

    /* --- Eligibility (trước đây TrendingDealEligibility) --- */

    public static final int MIN_PRICE_HISTORY_SPAN_DAYS = 7;
    public static final long SNAPSHOT_CACHE_TTL_SECONDS = 2L * 60 * 60;
    public static final int MIN_EXPLANATION_LENGTH = 40;
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final float MIN_REAL_DISCOUNT_PCT_INCLUSIVE = 10f; // S1
    public static final double MIN_TREND_SCORE_INCLUSIVE = 0.20;     // S3 (heuristic)
    public static final int MIN_POPULARITY_SCORE_INCLUSIVE = 50;     // S4 (heuristic)

    public static final double FAKE_PROMO_DEEP_DISCOUNT_PCT = 72.0;
    public static final double FAKE_PROMO_HISTORICAL_LOW_DISCOUNT_PCT = 18.0;
    public static final int FAKE_PROMO_RECENT_WINDOW_DAYS = 2;
    public static final double FAKE_PROMO_INFLATED_ORIGINAL_RATIO = 1.28;
    public static final double FAKE_PROMO_INFLATED_PAIR_DISCOUNT_PCT = 45.0;
    public static final double FAKE_PROMO_FLAT_CV_MAX = 0.05;
    public static final double FAKE_PROMO_CLIFF_DROP_FROM_MEAN_PCT = 35.0;
    public static final double FAKE_PROMO_FLASH_EXTREME_DISCOUNT_PCT = 78.0;
    public static final int FAKE_PROMO_STEEP_DROP_STEP_PCT = 10;
    public static final int FAKE_PROMO_MAX_STEEP_DROPS = 4;
    public static final double FAKE_PROMO_LOW_TRUST_CAP = 0.62;
    public static final double FAKE_PROMO_LOW_TRUST_DEEP_DISCOUNT_PCT = 65.0;

    public static boolean passesCoreListingRules(ProductListing p) {
        if (p == null) {
            return false;
        }
        return p.getPlatform() == null || !Boolean.FALSE.equals(p.getPlatform().getIsActive());
    }

    public static boolean hasMinimumPriceHistorySpan(List<PriceRecord> recs) {
        if (recs == null || recs.isEmpty()) {
            return false;
        }
        LocalDateTime min = recs.stream()
                .map(PriceRecord::getCrawledAt)
                .min(LocalDateTime::compareTo)
                .orElse(null);
        LocalDateTime max = recs.stream()
                .map(PriceRecord::getCrawledAt)
                .max(LocalDateTime::compareTo)
                .orElse(null);
        if (min == null || max == null) {
            return false;
        }
        long days = ChronoUnit.DAYS.between(min.toLocalDate(), max.toLocalDate());
        return days >= MIN_PRICE_HISTORY_SPAN_DAYS;
    }

    public static boolean hasInStockLatest(PriceRecord latest) {
        return latest != null && Boolean.TRUE.equals(latest.getInStock());
    }

    public static boolean isEligibleForTrending(
            ProductListing p,
            List<PriceRecord> recs) {

        PriceRecord latest = latest(recs);
        return passesCoreListingRules(p)
                && hasMinimumPriceHistorySpan(recs)
                && hasInStockLatest(latest)
                && !isLikelyFakePromo(recs);
    }

    public static boolean isEligibleOrganic(
            ProductListing listing,
            List<PriceRecord> recsDesc) {

        if (!isEligibleForTrending(listing, recsDesc)) {
            return false;
        }
        HistoricalDiscountResult hist = computeHistoricalDiscount(recsDesc);
        if (hist.discountPercent() < MIN_REAL_DISCOUNT_PCT_INCLUSIVE) {
            return false; // S1
        }
        double trend = calculateTrend(recsDesc);
        if (trend < MIN_TREND_SCORE_INCLUSIVE) {
            return false; // S3
        }
        int pop = listing != null && listing.getProduct() != null && listing.getProduct().getPopularityScore() != null
                ? listing.getProduct().getPopularityScore()
                : 0;
        if (pop < MIN_POPULARITY_SCORE_INCLUSIVE) {
            return false; // S4
        }
        return true;
    }

    public static boolean isLikelyFakePromo(List<PriceRecord> raw) {
        if (raw == null || raw.size() < 3) {
            return false;
        }

        List<PriceRecord> sorted = raw.stream()
                .filter(r -> r != null && r.getCrawledAt() != null)
                .sorted(Comparator.comparing(PriceRecord::getCrawledAt))
                .toList();
        if (sorted.size() < 3) {
            return false;
        }

        PriceRecord latest = sorted.get(sorted.size() - 1);
        double latestDisc = platformDiscountPct(latest);
        LocalDateTime anchor = latest.getCrawledAt();
        LocalDateTime recentCutoff = anchor.minusDays(FAKE_PROMO_RECENT_WINDOW_DAYS);

        if (suddenDeepDiscountAfterQuietHistory(sorted, latestDisc, recentCutoff)) {
            return true;
        }
        if (inflatedOriginalPricePattern(sorted, latestDisc)) {
            return true;
        }
        if (flatHistoryThenCliff(sorted, latest)) {
            return true;
        }
        if (Boolean.TRUE.equals(latest.getIsFlashSale())
                && latestDisc >= FAKE_PROMO_FLASH_EXTREME_DISCOUNT_PCT) {
            return true;
        }
        if (tooManySteepDrops(sorted)) {
            return true;
        }
        return false;
    }

    static double platformDiscountPct(PriceRecord r) {
        if (r.getDiscountPct() != null && r.getDiscountPct() >= 0) {
            return r.getDiscountPct();
        }
        Integer o = r.getOriginalPrice();
        Integer price = r.getPrice();
        if (o == null || o <= 0 || price == null) {
            return 0.0;
        }
        return (1.0 - price / (double) o) * 100.0;
    }

    private static boolean suddenDeepDiscountAfterQuietHistory(
            List<PriceRecord> sorted,
            double latestDisc,
            LocalDateTime recentCutoff) {

        if (latestDisc < FAKE_PROMO_DEEP_DISCOUNT_PCT) {
            return false;
        }
        List<PriceRecord> older = new ArrayList<>();
        for (PriceRecord r : sorted) {
            if (r.getCrawledAt().isBefore(recentCutoff)) {
                older.add(r);
            }
        }
        if (older.isEmpty()) {
            return false;
        }
        double avgOlder = older.stream().mapToDouble(TrendingDealEngine::platformDiscountPct).average().orElse(0);
        return avgOlder < FAKE_PROMO_HISTORICAL_LOW_DISCOUNT_PCT;
    }

    private static boolean inflatedOriginalPricePattern(List<PriceRecord> sorted, double latestDisc) {
        if (latestDisc < FAKE_PROMO_INFLATED_PAIR_DISCOUNT_PCT) {
            return false;
        }
        int n = sorted.size();
        if (n < 6) {
            return false;
        }
        int third = Math.max(1, n / 3);
        double medOld = medianOriginal(sorted.subList(0, third));
        double medNew = medianOriginal(sorted.subList(n - third, n));
        if (medOld <= 0 || medNew <= 0) {
            return false;
        }
        return medNew / medOld >= FAKE_PROMO_INFLATED_ORIGINAL_RATIO;
    }

    private static boolean flatHistoryThenCliff(List<PriceRecord> sorted, PriceRecord latest) {
        int n = sorted.size();
        if (n < 4) {
            return false;
        }
        int earlyEnd = Math.max(2, (int) Math.ceil(n * 0.7));
        List<PriceRecord> early = sorted.subList(0, earlyEnd);
        double mean = early.stream().mapToInt(PriceRecord::getPrice).average().orElse(0);
        if (mean <= 0) {
            return false;
        }
        double std = stdDevPrices(early);
        double cv = std / mean;
        if (cv > FAKE_PROMO_FLAT_CV_MAX) {
            return false;
        }
        int lastPrice = latest.getPrice();
        double threshold = mean * (1.0 - FAKE_PROMO_CLIFF_DROP_FROM_MEAN_PCT / 100.0);
        return lastPrice < threshold;
    }

    private static boolean tooManySteepDrops(List<PriceRecord> sorted) {
        int steep = 0;
        double step = 1.0 - FAKE_PROMO_STEEP_DROP_STEP_PCT / 100.0;
        for (int i = 1; i < sorted.size(); i++) {
            int p0 = sorted.get(i - 1).getPrice();
            int p1 = sorted.get(i).getPrice();
            if (p0 > 0 && p1 < p0 * step) {
                steep++;
            }
        }
        return steep >= FAKE_PROMO_MAX_STEEP_DROPS;
    }

    private static double medianOriginal(List<PriceRecord> segment) {
        List<Integer> vals = segment.stream()
                .map(PriceRecord::getOriginalPrice)
                .filter(Objects::nonNull)
                .filter(v -> v > 0)
                .sorted()
                .toList();
        if (vals.isEmpty()) {
            return 0.0;
        }
        int mid = vals.size() / 2;
        if (vals.size() % 2 == 1) {
            return vals.get(mid);
        }
        return (vals.get(mid - 1) + vals.get(mid)) / 2.0;
    }

    private static double stdDevPrices(List<PriceRecord> segment) {
        if (segment.size() < 2) {
            return 0.0;
        }
        double mean = segment.stream().mapToInt(PriceRecord::getPrice).average().orElse(0);
        double var = segment.stream()
                .mapToDouble(pr -> {
                    double d = pr.getPrice() - mean;
                    return d * d;
                })
                .average()
                .orElse(0);
        return Math.sqrt(var);
    }

    /* --- Historical discount (trước đây HistoricalPriceDiscount) --- */

    public record HistoricalDiscountResult(int referencePrice, int currentPrice, float discountPercent) {
    }

    public static HistoricalDiscountResult computeHistoricalDiscount(List<PriceRecord> recordsDesc) {
        PriceRecord latest = latest(recordsDesc);
        if (latest == null) {
            return new HistoricalDiscountResult(0, 0, 0f);
        }
        int current = latest.getPrice() != null ? latest.getPrice() : 0;
        List<PriceRecord> sorted = recordsAsc(recordsDesc);
        if (sorted.isEmpty()) {
            return new HistoricalDiscountResult(0, current, 0f);
        }
        int n = sorted.size();
        int excludeRecent = Math.max(1, Math.min(n - 1, (int) Math.ceil(n * 0.2)));
        List<Integer> refPrices = new ArrayList<>();
        for (int i = 0; i < n - excludeRecent; i++) {
            Integer p = sorted.get(i).getPrice();
            if (p != null && p > 0) {
                refPrices.add(p);
            }
        }
        if (refPrices.isEmpty()) {
            for (int i = 0; i < n - 1; i++) {
                Integer p = sorted.get(i).getPrice();
                if (p != null && p > 0) {
                    refPrices.add(p);
                }
            }
        }
        int reference = medianInt(refPrices);
        if (reference <= 0) {
            reference = current > 0 ? current : 0;
        }
        if (reference <= 0 || current <= 0) {
            return new HistoricalDiscountResult(reference, current, 0f);
        }
        double raw = (reference - current) / (double) reference * 100.0;
        float pct = (float) Math.max(0.0, Math.min(100.0, raw));
        return new HistoricalDiscountResult(reference, current, pct);
    }

    private static int medianInt(List<Integer> values) {
        if (values.isEmpty()) {
            return 0;
        }
        List<Integer> copy = new ArrayList<>(values);
        copy.sort(Integer::compareTo);
        int mid = copy.size() / 2;
        if (copy.size() % 2 == 1) {
            return copy.get(mid);
        }
        return (copy.get(mid - 1) + copy.get(mid)) / 2;
    }

    /* --- Scoring (trước đây TrendingDealScorer) --- */

    public static DealScoreCalculation score(
            ProductListing listing,
            List<PriceRecord> recordsDesc) {

        PriceRecord latest = latest(recordsDesc);
        if (latest == null) {
            return DealScoreCalculation.zero();
        }

        HistoricalDiscountResult hist = computeHistoricalDiscount(recordsDesc);
        double discount = Math.min(1.0, Math.max(0.0, hist.discountPercent() / 100.0));

        double trend = calculateTrend(recordsDesc);
        double trust = calculateTrustFromHistory(recordsDesc);
        double popularity = calculatePopularity(listing != null && listing.getProduct() != null
                ? listing.getProduct().getPopularityScore()
                : null);
        double freshness = calculateFreshness(latest.getCrawledAt());

        double total = W_DISCOUNT * discount
                + W_TREND * trend
                + W_TRUST * trust
                + W_POP * popularity
                + W_FRESH * freshness;

        return new DealScoreCalculation(discount, trend, trust, popularity, freshness, total);
    }

    private static double calculateTrend(List<PriceRecord> recordsDesc) {
        if (recordsDesc == null || recordsDesc.size() < 3) {
            return 0.0;
        }
        List<PriceRecord> records = recordsAsc(recordsDesc);
        if (records.size() < 3) {
            return 0.0;
        }
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        int n = records.size();
        for (int i = 0; i < n; i++) {
            double x = i;
            double y = records.get(i).getPrice();
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }
        double denom = n * sumX2 - sumX * sumX;
        if (denom == 0) {
            return 0.0;
        }
        double slope = (n * sumXY - sumX * sumY) / denom;
        return Math.min(1.0, Math.max(0.0, -slope / 10000.0));
    }

    private static double calculateTrustFromHistory(List<PriceRecord> recordsDesc) {
        // Không còn bảng Signal: ước lượng trust từ độ dày & chất lượng lịch sử giá.
        List<PriceRecord> asc = recordsAsc(recordsDesc);
        if (asc.size() < 3) {
            return 0.50;
        }
        long spanDays = ChronoUnit.DAYS.between(
                asc.get(0).getCrawledAt().toLocalDate(),
                asc.get(asc.size() - 1).getCrawledAt().toLocalDate());
        double spanScore = Math.min(1.0, Math.max(0.0, (spanDays - 7.0) / 21.0)); // 7d->0, 28d->1
        double densityScore = Math.min(1.0, asc.size() / 20.0);                   // 20 points -> 1
        double base = 0.55;
        return Math.max(0.0, Math.min(1.0, base + 0.25 * spanScore + 0.20 * densityScore));
    }

    private static double calculatePopularity(Integer popularity) {
        if (popularity == null || popularity <= 0) {
            return 0.0;
        }
        return Math.min(1.0, popularity / 10000.0);
    }

    private static double calculateFreshness(LocalDateTime crawlTime) {
        if (crawlTime == null) {
            return 0.0;
        }
        long hours = ChronoUnit.HOURS.between(crawlTime, LocalDateTime.now());
        if (hours <= 2) {
            return 1.0;
        }
        return Math.max(0.0, 1.0 - (hours - 2) / 48.0);
    }

    public static final class Explanations {
        private static final DateTimeFormatter VI_TIME =
                DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", new Locale("vi", "VN"));

        private Explanations() {
        }

        public static String forDeal(
                ProductListing listing,
                DealScoreCalculation calc,
                float realDiscountPct,
                PriceRecord latest) {

            StringBuilder sb = new StringBuilder(160);
            sb.append(String.format(Locale.ROOT,
                    "Giảm khoảng %.0f%% so với giá tham chiếu từ lịch sử (tránh giá gốc sàn thổi phồng).",
                    realDiscountPct));
            sb.append(" Xu hướng tính trên lịch sử tối thiểu 7 ngày.");
            if (latest != null && latest.getCrawledAt() != null) {
                sb.append(" Cập nhật giá gần nhất: ").append(VI_TIME.format(latest.getCrawledAt())).append('.');
            }
            sb.append(String.format(Locale.ROOT,
                    " Điểm deal tổng %.2f (ưu tiên giảm thật / xu hướng / tin cậy).",
                    calc.totalDealScore()));
            String text = sb.toString().trim();
            if (text.length() < MIN_EXPLANATION_LENGTH) {
                text = text + " Deal đạt tiêu chí trending: không khuyến mãi ảo, listing đang hoạt động, còn hàng.";
            }
            return text;
        }
    }

    public static PriceRecord latest(List<PriceRecord> recordsDesc) {
        if (recordsDesc == null || recordsDesc.isEmpty()) {
            return null;
        }
        return recordsDesc.stream()
                .filter(r -> r != null && r.getCrawledAt() != null)
                .max(Comparator.comparing(PriceRecord::getCrawledAt))
                .orElse(null);
    }

    public static List<PriceRecord> recordsAsc(List<PriceRecord> recordsDesc) {
        if (recordsDesc == null || recordsDesc.isEmpty()) {
            return List.of();
        }
        return recordsDesc.stream()
                .filter(r -> r != null && r.getCrawledAt() != null && r.getPrice() != null)
                .sorted(Comparator.comparing(PriceRecord::getCrawledAt))
                .toList();
    }
}
