package com.pricehawl.service;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import org.mockito.MockitoAnnotations;

import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.repository.ProductRepository;

@DisplayName("ProductService Tests")
class ProductServiceTest {

    @Mock
    private ProductRepository repository;

    @InjectMocks
    private ProductService productService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    // ================= HELPER =================
    private List<Object[]> buildRows(Object[]... rows) {
        List<Object[]> list = new ArrayList<>();
        for (Object[] row : rows) {
            list.add(row);
        }
        return list;
    }

    // ================= TEST =================

    @Test
    @DisplayName("Return empty when keyword is null")
    void testSearchWithNullKeyword() {
        List<ProductSearchDTO> result = productService.search(null);
        assertTrue(result.isEmpty());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Return empty when keyword is empty")
    void testSearchWithEmptyKeyword() {
        List<ProductSearchDTO> result = productService.search("");
        assertTrue(result.isEmpty());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Return empty when keyword too short")
    void testSearchWithShortKeyword() {
        List<ProductSearchDTO> result = productService.search("a");
        assertTrue(result.isEmpty());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Return empty when keyword is whitespace")
    void testSearchWithWhitespaceKeyword() {
        List<ProductSearchDTO> result = productService.search("   ");
        assertTrue(result.isEmpty());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Return results with valid keyword")
    void testSearchWithValidKeyword() {

        Object[] row1 = { "1", "iPhone 15", "Apple smartphone", "Electronics", "Apple", 95.5 };
        Object[] row2 = { "2", "iPhone 14", "Apple smartphone", "Electronics", "Apple", 85.0 };

        List<Object[]> mockRows = buildRows(row1, row2);

        when(repository.fuzzySearchRaw("iphone")).thenReturn(mockRows);

        List<ProductSearchDTO> result = productService.search("iphone");

        assertEquals(2, result.size());

        ProductSearchDTO first = result.get(0);
        assertEquals("1", first.getId());
        assertEquals("iPhone 15", first.getName());
        assertEquals("Apple", first.getBrandName());
        assertEquals(95.5, first.getScore());

        ProductSearchDTO second = result.get(1);
        assertEquals("2", second.getId());
        assertEquals("iPhone 14", second.getName());
        assertEquals(85.0, second.getScore());

        verify(repository).fuzzySearchRaw("iphone");
    }

    @Test
    @DisplayName("Trim keyword before searching")
    void testSearchTrimsKeyword() {

        Object[] row = { "1", "Samsung Galaxy", "Smartphone", "Electronics", "Samsung", 90.0 };

        List<Object[]> mockRows = buildRows(row);

        when(repository.fuzzySearchRaw("samsung")).thenReturn(mockRows);

        List<ProductSearchDTO> result = productService.search("  samsung  ");

        assertEquals(1, result.size());
        assertEquals("Samsung Galaxy", result.get(0).getName());

        verify(repository).fuzzySearchRaw("samsung");
    }

    @Test
    @DisplayName("Return empty when repository returns empty")
    void testSearchWithNoResults() {

        when(repository.fuzzySearchRaw(anyString())).thenReturn(new ArrayList<>());

        List<ProductSearchDTO> result = productService.search("nonexistent");

        assertTrue(result.isEmpty());

        verify(repository).fuzzySearchRaw("nonexistent");
    }
}