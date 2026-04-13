export async function searchProducts(query: string) {
    const res = await fetch(`http://localhost:8080/products/search?q=${encodeURIComponent(query)}`);

    if (!res.ok) {
        throw new Error("API error");
    }

    return res.json();
}