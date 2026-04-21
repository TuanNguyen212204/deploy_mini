package com.pricehawl.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PlatformDTO {

    private String platform;
    private String url;
    private String platformImageUrl;
    private Double finalPrice;
    private Boolean isOfficial;
}