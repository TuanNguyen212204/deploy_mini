import React, { useMemo } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import ProductGallery from '../components/product/ProductGallery';
import ProductSummary from '../components/product/ProductSummary';
import QuickCompareStrip from '../components/product/QuickCompareStrip';
import PriceChart from '../components/product/PriceChart';
import ProductCard from '../components/product/ProductCard';

import { getProductById, getProductsByIds } from '../data/mockProducts';

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

export default function ProductDetailPage() {
    const { id } = useParams();
    const product = getProductById(Number(id));

    const relatedProducts = useMemo(() => {
        if (!product) return [];
        return getProductsByIds(product.relatedProductIds);
    }, [product]);

    if (!product) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FCF8F4] px-6">
                <div className="rounded-[34px] border border-stone-200/80 bg-white px-8 py-10 text-center shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
                    <h2
                        className="text-3xl text-stone-900"
                        style={{ fontFamily: FONT_STACK.serif }}
                    >
                        Không tìm thấy sản phẩm
                    </h2>

                    <Link
                        to="/"
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1F1A17] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                        <ArrowLeft size={16} />
                        Quay về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-[#FCF8F4] text-stone-900"
            style={{ fontFamily: FONT_STACK.sans }}
        >
            <div className="pointer-events-none fixed left-[-10%] top-[-15%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] opacity-30 blur-[120px]" />
            <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[32vw] w-[32vw] rounded-full bg-[#F4EEE7] opacity-90 blur-[120px]" />

            <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-10">
                <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-stone-500">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/80 px-4 py-2 transition hover:text-stone-900"
                    >
                        <ArrowLeft size={16} />
                        Trang chủ
                    </Link>

                    <ChevronRight size={16} />
                    <span>{product.brand}</span>
                    <ChevronRight size={16} />
                    <span className="text-stone-900">{product.name}</span>
                </div>

                <section className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
                    <div>
                        <ProductGallery
                            images={product.images}
                            title={product.name}
                            showLowestBadge={false}
                        />
                    </div>

                    <div>
                        <ProductSummary product={product} />
                    </div>
                </section>

                <section className="mt-10">
                    <QuickCompareStrip items={product.platforms} />
                </section>

                <section className="mt-16">
                    <PriceChart
                        data={product.priceHistory30d}
                        title="Biến động giá gần đây"
                    />
                </section>

                <section className="mt-10">
                    <div className="overflow-hidden rounded-[28px] border border-stone-200/80 bg-white/75">
                        {Object.entries(product.specs).map(([key, value], index, arr) => (
                            <div
                                key={key}
                                className={`flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8 ${
                                    index !== arr.length - 1 ? 'border-b border-stone-200/70' : ''
                                }`}
                            >
                                <p className="min-w-[180px] text-[10px] uppercase tracking-normal text-stone-400">
                                    {key}
                                </p>
                                <p className="text-sm leading-7 text-stone-800">{value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-16">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {relatedProducts.map((item) => (
                            <ProductCard key={item.id} product={item} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}