package com.pricehawl.controller;

import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.service.ProductService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
@RestController
@RequestMapping("/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public List<ProductSearchDTO> search(@RequestParam("q") String keyword) {
        return service.search(keyword);
    }
}