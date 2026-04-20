package com.pricehawl.controller;

import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.service.ProductService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

// ==========================================================================
// ProductController — /products/** và /api/products/** (alias sau khi merge)
// --------------------------------------------------------------------------
// Checklist đã cover (post-merge):
//   1. @RequestParam(q) null/rỗng:
//        required = false, defaultValue = "" + guard trim().isEmpty().
//   2. Repository/JPA đổi cột sau merge → service đã bọc try-catch quanh
//        fuzzySearchRaw / findAllByIdIn và log ex.getMessage() đầy đủ.
//        SQLGrammarException ("column xxx does not exist") sẽ hiện rõ ở log.
//   3. Service không được trả null → controller vẫn double-check `result == null`
//        và quy về Collections.emptyList().
//   4. Toàn bộ handler bọc try-catch, log ex.getMessage() + stacktrace
//        (truyền exception làm tham số cuối cho SLF4J).
//   5. Support cả path cũ + path mới: FE legacy gọi `/products/search`,
//        FE mới gọi `/api/products/search` → cùng 1 handler.
// ==========================================================================
@RestController
@RequestMapping(path = {"/products", "/api/products"})
@CrossOrigin(origins = "http://localhost:5173")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public List<ProductSearchDTO> search(
            @RequestParam(value = "q", required = false, defaultValue = "") String keyword) {

        // 1. Guard null/rỗng ở tầng controller (service cũng đã guard, nhưng
        //    chặn ngay để tiết kiệm 1 call + log rõ ràng).
        if (keyword == null || keyword.trim().isEmpty()) {
            log.debug("/products/search: keyword rỗng → trả về []");
            return Collections.emptyList();
        }

        // 4. Toàn bộ handler bọc try-catch. Log cả message lẫn stacktrace
        //    (tham số thứ 3 của SLF4J là Throwable, tự in stack đầy đủ).
        try {
            List<ProductSearchDTO> result = service.search(keyword);

            // 3. Double-check: service KHÔNG được trả null, nhưng vẫn phòng hờ.
            if (result == null) {
                log.warn("/products/search: service.search(\"{}\") trả về null, quy về [] để FE render an toàn", keyword);
                return Collections.emptyList();
            }
            return result;

        } catch (Exception ex) {
            // Log message (ngắn) + stacktrace (chi tiết). Sau khi merge nếu
            // Repository/JPA đổi cột, ở đây sẽ thấy ngay
            // SQLGrammarException / PropertyReferenceException kèm line.
            log.error(
                    "/products/search FAILED — keyword='{}', exception={}, message={}",
                    keyword,
                    ex.getClass().getSimpleName(),
                    ex.getMessage(),
                    ex);
            return Collections.emptyList();
        }
    }
}
