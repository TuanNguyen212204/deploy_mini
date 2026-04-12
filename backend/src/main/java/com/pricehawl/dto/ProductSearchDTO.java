package com.pricehawl.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
public class ProductSearchDTO {

    private String id;
    private String name;
    private String description;
    private String categoryName;
    private String brandName;
    private Double score;

    // Manual constructor untuk ProductService.search()
    public ProductSearchDTO(String id, String name, String description,
            String categoryName, String brandName, Double score) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.categoryName = categoryName;
        this.brandName = brandName;
        this.score = score;
    }

    // Getter
    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public String getBrandName() {
        return brandName;
    }

    public Double getScore() {
        return score;
    }

    // Setter
    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public void setScore(Double score) {
        this.score = score;
    }

}
