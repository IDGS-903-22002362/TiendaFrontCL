# Graph Report - TiendaFrontCL  (2026-10-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3995 nodes · 11641 edges · 189 communities (166 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 169 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4ee5c5c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 124
- Community 125
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186

## God Nodes (most connected - your core abstractions)
1. `cn()` - 302 edges
2. `react` - 163 edges
3. `Button` - 140 edges
4. `next` - 122 edges
5. `getApiErrorMessage()` - 102 edges
6. `lucide-react` - 93 edges
7. `useAuth()` - 81 edges
8. `proxyToBackend()` - 73 edges
9. `useToast()` - 72 edges
10. `Input` - 70 edges

## Surprising Connections (you probably didn't know these)
- `TestGeneratedConfigIsValidJs` --uses--> `TailwindConfigGenerator`  [INFERRED]
  .cursor/skills/ui-styling/scripts/tests/test_tailwind_config_gen.py → .cursor/skills/ui-styling/scripts/tailwind_config_gen.py
- `TestTailwindConfigGenerator` --uses--> `TailwindConfigGenerator`  [INFERRED]
  .cursor/skills/ui-styling/scripts/tests/test_tailwind_config_gen.py → .cursor/skills/ui-styling/scripts/tailwind_config_gen.py
- `ToastAction` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/toast.tsx → src/lib/utils.ts
- `ToastDescription` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/toast.tsx → src/lib/utils.ts
- `ToastTitle` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/toast.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (189 total, 23 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (85): date-fns, AdminListPagination(), AdminOrdersPage(), badgeVariants, formatCurrency(), formatRefundDate(), getPaymentProvider(), getVisiblePages() (+77 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (68): @radix-ui/react-avatar, @radix-ui/react-dropdown-menu, @radix-ui/react-menubar, CATEGORY_IMAGE_CLASS, CategoryFooter(), CategoryGrid(), CategoryImage(), Avatar (+60 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (68): ContentConfigBuilderProps, ButtonDraft, EMPTY_CONFIG, EMPTY_FORM, AdminProductsPage(), buildFedexShippingPayload(), createDetailDraft(), createDraftId() (+60 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (63): @radix-ui/react-radio-group, ACCEPTED_PAYMENT_BRANDS, assertDeliveryShippingReady(), buildAddressValidationKey(), buildCheckoutPayload(), buildFedExDireccionEnvio(), buildManualFedExShippingSelection(), CheckoutPricing (+55 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (53): AdminAssistantPage(), AdminBannersPage(), AdminCategoriasPage(), EMPTY_FORM, FormState, normalizeSearch(), AdminFedExPage(), JsonBlock() (+45 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (3): main(), ShadcnInstaller, TestShadcnInstaller

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (42): react, ProductQnA(), AiBotAvatar(), AiBotAvatarProps, AiMessageThread(), AiMessageThreadProps, InlineToken, isSafeHttpUrl() (+34 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (58): ActiveTargetOptionConfig, AdminListPaginationProps, AdminOfertasPage(), apiRequest(), AplicaA, canDeleteEntity(), CodigoPromocion, CodigoPromocionForm (+50 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (53): CATALOG_SORTS, dynamic, getCatalogSort(), getNumberParam(), getSingleParam(), isLegacySaleRoute(), ProductsPage(), resolveInitialOnlyOffers() (+45 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (17): test_sync_parses_bundled_starter_template(), build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (36): next, bodyFont, headlineFont, metadata, RootLayout(), getSiteUrl(), robots(), metadata (+28 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (53): dependencies, class-variance-authority, clsx, date-fns, dotenv, echarts, embla-carousel-react, firebase (+45 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (14): ansi_ljust(), DesignSystemGenerator, _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (39): BackendAuthResponse, DELETE(), GET(), joinBackendUrl(), POST(), AuthUsuario, FALLBACK_BACKEND_BASE, joinBackendApiUrl() (+31 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (38): ContentConfigBuilder(), OfertaBannerOption, InventoryAdjustmentsPage(), UPDATE_TYPE_OPTIONS, UpdateMode, UpdateType, extractProductDetail(), formatMovementDate() (+30 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (43): resolveCartIdForPickup(), verificarDisponibilidadCodigos(), CartContext, CartContextType, CartProvider(), addCartItem(), checkoutCart(), clearCart() (+35 more)

### Community 17 - "Community 17"
Cohesion: 0.05
Nodes (46): extractCreateId(), mapDetailRecord(), ProductAdminDetail, ProductCreatePayload, ProductCreateResponse, ProductDetailPayload, ProductDetailRecord, ProductUpdatePayload (+38 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (39): ProductPage(), runMaintenance(), RecommendationCarousel(), CartRecommendations(), load(), HomeRecommendations(), load(), ProductRecommendations() (+31 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (32): class-variance-authority, lucide-react, AdminLayout(), navGroups, EmpleadoClubLayout(), navLinks, EmpleadoLayout(), getStaffRoleLabel() (+24 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (31): AdminAiPage(), formatDateTime(), AdminPointsPage(), AiPage(), AiWorkspace(), handleSendMessage(), formatDateTime(), OrderSummaryPanel() (+23 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (16): detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv(), detect_domain(), _load_csv() (+8 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (38): loadAdminAi(), handleDownload(), activeTryOnPolls, ApiEnvelope, asRole(), createAiStreamError(), createRequestId(), getAiAdminMetrics() (+30 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (36): AuthContext, AuthContextType, AuthProvider(), clearLocalSession(), createLocalSessionFromBackendToken(), createLocalSessionFromFirebaseToken(), getLocalSessionStatus(), RegisterOrLoginPayload (+28 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (37): BLOCK_NORMALIZERS, BLOCK_TYPES, BlockBase, CHART_TYPES, CLASSIFICATIONS, currencyFormatter, DIAGRAM_TYPES, EVIDENCE_LEVELS (+29 more)

### Community 25 - "Community 25"
Cohesion: 0.05
Nodes (37): name, private, version, clsx, eslint, eslint-config-next, genkit-cli, gsap (+29 more)

### Community 26 - "Community 26"
Cohesion: 0.10
Nodes (36): ALLOWED_REDIRECT_MODULOS, buildRedireccion(), DateValue, EmpleadoClubBeneficiosPage(), EMPTY_FORM, formatDate(), formatPuntosRecompensaInput(), formFromBeneficio() (+28 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (27): DesktopNav(), DesktopNavProps, isSectionActive(), FALLBACK_NAV_MODEL, StorefrontHeader(), StorefrontHeaderProps, MegaMenuOverlay(), MegaMenuOverlayProps (+19 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (37): AGGREGATE_CATALOG_SORTS, fetchCatalogFallbackPage(), fetchProductById(), fetchProductsByCategory(), fetchProductsByLine(), fetchProductsFromEndpoint(), getCatalogCursorOffset(), getCatalogImageCount() (+29 more)

### Community 29 - "Community 29"
Cohesion: 0.05
Nodes (37): $type, $value, background, destructive, destructive-foreground, foreground, muted, muted-foreground (+29 more)

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (33): cargarProductosSugeridosEnOferta(), commitSuggestions(), HomeDynamicRails(), HomeRailSection(), HomeRailSectionProps, filterOfertasHomeRailProducts(), filterVisibleHomeRailProducts(), loadBuyAgainRailProducts() (+25 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (16): format_context(), format_result(), main(), calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion(), get_layout_for_goal() (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (27): AdminNotificationItem, AdminNotificationsPanel(), AdminNotificationsPanelProps, formatRelativeTime(), getConnectionLabel(), getNotificationIcon(), DateTimePickerField(), DateTimePickerFieldProps (+19 more)

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (32): BlockTitle(), CLASSIFICATION_LABEL, ComparisonBlock(), DiagramBlock(), EVIDENCE_LABEL, INSIGHT_PRIORITY_LABEL, InsightBlock(), MetricList() (+24 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (33): PendingCheckoutReconciler(), abandonCheckoutAttempt(), abandonCheckoutAttemptWithRetry(), cancelActiveCheckoutAttemptIfAny(), cancelCheckoutAttempt(), CHECKOUT_PAYMENT_REDIRECTING_KEY, CheckoutAttemptAbandonResult, CheckoutAttemptReconcilePendingResult (+25 more)

### Community 35 - "Community 35"
Cohesion: 0.06
Nodes (32): REASON_MESSAGES, AiAdminMetrics, AiChatResult, AiChatToolCallSummary, AiMessageRole, AiSessionDetail, AiSessionStatus, AiSseError (+24 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (33): buildFedExQuotePayload(), fedexAdminApi, fedexApi, FedExDireccionEnvio, FedExPostalValidationResult, FedExQuoteAddress, FedExQuoteDireccionEnvio, FedExQuotePayload (+25 more)

### Community 37 - "Community 37"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (30): DateValue, EmpleadoClubPatrocinadoresPage(), EMPTY_FORM, formatDate(), formFromPatrocinador(), FormState, LOGO_VARIANT_LABEL, logoPreviewSrc() (+22 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (23): @googlemaps/js-api-loader, POST(), POST(), CheckoutAddressAutocomplete(), getSuggestionLabel(), PlaceSuggestion, Props, getComponent() (+15 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (24): @tabler/icons-react, AppleCardsCarouselDemo(), data, buildProductBadge(), buildProductFooter(), EMPTY_TAB_PRODUCTS, getDiscountPercent(), HomeOfertasSection() (+16 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (27): formatDate(), OrderDetailPage(), SummaryRow(), getDeliveryStatusLabel(), describeHistoryEntry(), formatDateTime(), isFinalDeliveryEvent(), OrderTimeline() (+19 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (26): EMPLEADO_ADMIN_BLOCKED_PREFIXES, EMPLEADO_ADMIN_PREFIXES, EmpleadoAdminPath, getEmpleadoDefaultAdminPath(), isEmpleadoAdminPath(), CL_APP_CONTEXT_MAX_AGE_SECONDS, INTERNAL_ROLES, isInternalAccount() (+18 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (28): AdminNotificationsPayload, ApiEnvelope, flattenStockAlerts(), ListAlertsParams, ListMovementsParams, localAuthOptions(), mapMovement(), mapMovementQuantity() (+20 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.23
Nodes (28): normalizeAdminReport(), normalizeAdminReportTrace(), normalizeAnomalyBlock(), normalizeBlock(), normalizeChartBlock(), normalizeChartData(), normalizeColumns(), normalizeComparisonBlock() (+20 more)

### Community 47 - "Community 47"
Cohesion: 0.10
Nodes (24): getMexicoPointsReportDefaults(), getMyWalletTransactions(), LegacyAssignBySaleResponse, LegacyAssignmentsResponse, LOYALTY_POINTS_RATE, LoyaltyTransaction, LoyaltyWallet, mexicoDayKey() (+16 more)

### Community 49 - "Community 49"
Cohesion: 0.12
Nodes (20): dotenv, genkit, @genkit-ai/google-genai, aiProductSearch(), aiProductSearchFlow, AiProductSearchInput, AiProductSearchInputSchema, AiProductSearchOutput (+12 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (21): @radix-ui/react-accordion, ProductDetailsClient(), ProductQnA, AccordionSection(), AccordionSectionItem, StickySidebar(), StickySidebarProps, PAYMENT_METHODS (+13 more)

### Community 51 - "Community 51"
Cohesion: 0.12
Nodes (23): dedupeProducts(), dynamic, Home(), metadata, CategorySection(), normalizeSearch(), EditorialSplit(), EditorialSplitProps (+15 more)

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (22): CartPage(), applyOfferPricingToSuggestions(), buildSuggestionsFromCatalog(), CartDrawer(), catalogCardToSuggestion(), getCodigoResultadoItems(), getProductNumber(), getProductString() (+14 more)

### Community 53 - "Community 53"
Cohesion: 0.17
Nodes (20): RegisterPage(), RequestVerificationResponse, VALID_GENEROS, VerifyRegistrationResponse, QuantitySelector(), QuantitySelectorProps, AddToCartBar(), AddToCartBarProps (+12 more)

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (22): APP_CLIENT_ORIGINS, APP_SOURCE_QUERY_PARAM, CL_APP_CONTEXT_COOKIE, CLIENT_ORIGIN_HEADER, CLUBLEON_MOBILE_UA_MARKERS, isAppClientOrigin(), LEGACY_MOBILE_QUERY_PARAMS, TRACKING_DISABLED_VALUE (+14 more)

### Community 55 - "Community 55"
Cohesion: 0.17
Nodes (21): embla-carousel-react, getTabs(), ProductRail(), ProductRailProps, ProductRailTab, ProductCarousel(), ProductCarouselProps, SectionHeading() (+13 more)

### Community 56 - "Community 56"
Cohesion: 0.19
Nodes (23): countProductsForLinea(), findProductByClave(), getCategoryCards(), getCategoryDescription(), getCategoryEyebrow(), getFeaturedProducts(), getHomeFeaturedCollectionProduct(), getHomeLineaCards() (+15 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (16): ClientPrivacyContextValue, ClientPrivacyProvider(), ClientPrivacyReactContext, getPrivacyContextForTracking(), trackEvent(), TrackEventInput, getClientOriginForRequests(), setClientOriginForRequests() (+8 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (13): abandonAttempt(), authHeaders(), clearCart(), pickupCheckoutPayload, resetProductoStock(), seedCart(), startCheckoutAttempt(), authHeaders() (+5 more)

### Community 59 - "Community 59"
Cohesion: 0.16
Nodes (20): firebase, ADMIN_STAFF_ROLES, AdminNotificationItem, AdminNotificationsConnectionStatus, isAdminStaffRole(), mapNotificationDoc(), useAdminNotificationsRealtime(), UseAdminNotificationsRealtimeOptions (+12 more)

### Community 60 - "Community 60"
Cohesion: 0.21
Nodes (17): LoginPage(), LoginPageContent(), RequestVerificationResponse, VerifyAndLoginResponse, AppNotificationBanner(), APPLE_REVIEW_TEST_EMAIL, isAppleReviewTestEmail(), getRemainingOtpAttempts() (+9 more)

### Community 61 - "Community 61"
Cohesion: 0.12
Nodes (22): $type, $value, radius, border, padding, radius, shadow, border (+14 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (22): $type, $value, sm, $type, $value, $type, $value, $type (+14 more)

### Community 64 - "Community 64"
Cohesion: 0.17
Nodes (19): ConfirmationClient(), FAILED_STATUSES, formatCurrency(), formatOrderRef(), getPaymentLabel(), isBackendPaid(), isPaymentFailed(), isStripePaid() (+11 more)

### Community 65 - "Community 65"
Cohesion: 0.20
Nodes (20): fulfillmentAdminApi, ListOrdenesQuery, ManualShippingStatusInput, ManualTrackingInput, mapDireccionEnvio(), mapHistory(), mapItems(), mapOrden() (+12 more)

### Community 66 - "Community 66"
Cohesion: 0.10
Nodes (20): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+12 more)

### Community 67 - "Community 67"
Cohesion: 0.13
Nodes (10): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+2 more)

### Community 68 - "Community 68"
Cohesion: 0.10
Nodes (21): $type, $value, $type, $value, $type, $value, $type, $value (+13 more)

### Community 69 - "Community 69"
Cohesion: 0.15
Nodes (17): @radix-ui/react-toast, AppNotificationBannerProps, AppNotificationLayout(), AppNotificationLayoutProps, AppNotificationVariant, toastVariantToAppVariant(), variantConfig, Toast (+9 more)

### Community 70 - "Community 70"
Cohesion: 0.16
Nodes (17): HoverImagePreview(), HoverImagePreviewProps, uniqueImages(), getCatalogBadge(), isProductSoldOut(), ProductCard(), ProductCardProps, getHomeBadge() (+9 more)

### Community 71 - "Community 71"
Cohesion: 0.16
Nodes (17): FulfillmentMethod, mapAvailabilityItem(), mapPickupAvailability(), mapPickupLocation(), pickupApi, PickupAvailability, PickupContact, PickupLocation (+9 more)

### Community 72 - "Community 72"
Cohesion: 0.16
Nodes (20): applyCatalogOfferPricingToProduct(), applyCatalogOfferPricingToProducts(), applyOfferPricingToProduct(), buildCatalogOfferPricingItems(), buildOfferPricingFromCatalogItems(), buildPricingBatchKey(), CalcularOfertaItem, CartItemOfferLine (+12 more)

### Community 73 - "Community 73"
Cohesion: 0.21
Nodes (18): AdminHomePage(), loadDashboardData(), AdminInlineAlert(), AdminQuickActionCard(), AdminSection(), formatAdminCurrency(), calculateEarningsSummary(), EarningsSummary (+10 more)

### Community 74 - "Community 74"
Cohesion: 0.16
Nodes (18): AvisoDePrivacidadPage(), ContentBlocks(), InlineParts(), metadata, Section(), SubSection(), AVISO_INTRO, AVISO_METADATA (+10 more)

### Community 75 - "Community 75"
Cohesion: 0.20
Nodes (18): AdminAssistantStreamHandlers, AdminAssistantTurn, AdminReportResult, ApiEnvelope, askAdminAssistantJson(), askAdminAssistantStream(), getAdminAssistantSessionDetail(), LOCAL (+10 more)

### Community 76 - "Community 76"
Cohesion: 0.14
Nodes (18): ApiErrorPayload, ApiFetchOptions, attachCsrfHeader(), getPayloadCode(), getPayloadErrorObject(), getPayloadMessage(), isAuthSessionPath(), prepareApiRequest() (+10 more)

### Community 77 - "Community 77"
Cohesion: 0.16
Nodes (9): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+1 more)

### Community 78 - "Community 78"
Cohesion: 0.12
Nodes (19): $type, $value, bg, fg, font-size, hover-bg, padding-x, bg (+11 more)

### Community 79 - "Community 79"
Cohesion: 0.16
Nodes (17): AdminAssistantPanel(), boot(), formatDateTime(), formatRelativeTime(), PROMPT_SUGGESTIONS, SuggestionCard, TOOL_LABELS, TraceDetails() (+9 more)

### Community 80 - "Community 80"
Cohesion: 0.16
Nodes (16): isSamePersonalization(), PersonalizationMap, readLocalStorage(), StorefrontContext, StorefrontContextValue, StorefrontProvider(), writeLocalStorage(), addFavorite() (+8 more)

### Community 81 - "Community 81"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 82 - "Community 82"
Cohesion: 0.19
Nodes (12): dsn, onRouterTransitionStart, onRequestError, register(), baseSecurityHeaders, checkoutCsp, defaultCsp, nextConfig (+4 more)

### Community 83 - "Community 83"
Cohesion: 0.20
Nodes (15): forward(), GET(), getSuffix(), POST(), forward(), GET(), getSuffix(), POST() (+7 more)

### Community 84 - "Community 84"
Cohesion: 0.25
Nodes (18): AiTryOnPanel(), handleClearPhoto(), handleRunTryOn(), handleSelectFile(), buildLocalMessage(), getTryOnEligibilityMessage(), createAiSession(), createTryOnJob() (+10 more)

### Community 85 - "Community 85"
Cohesion: 0.19
Nodes (9): handleSendMessage(), buildProductContextMessage(), escapeRegExp(), extractProductContextPayloads(), getProductContextPattern(), messageContainsProductContext(), ProductContextPayload, stripProductContextFromMessage() (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.22
Nodes (13): DELETE(), forward(), GET(), getSuffix(), HEAD, OPTIONS, PATCH, POST() (+5 more)

### Community 88 - "Community 88"
Cohesion: 0.18
Nodes (16): cargarOfertasCarrito(), buildCartItemsWithOfferPrices(), CheckoutPage(), cargarOfertasCheckout(), validarCodigoCheckout(), getExpectedCheckoutPricing(), getStringArrayFromCartItem(), readPaymentCanceledFromUrl() (+8 more)

### Community 89 - "Community 89"
Cohesion: 0.30
Nodes (15): findCategoryForProduct(), getCategorySlug(), getNumberProperty(), getProductCategoryValues(), getProductDiscountPercent(), getProductImage(), getProductName(), getProductRecord() (+7 more)

### Community 90 - "Community 90"
Cohesion: 0.19
Nodes (14): ADMIN_CHART_COLORS, AdminEchartsModel, axisText, baseGrid, buildAdminChartModel(), buildForecastChartModel(), seriesKeys(), productChart (+6 more)

### Community 91 - "Community 91"
Cohesion: 0.20
Nodes (12): canNotifyMobileApp(), hasNativeMobileBridge(), isEmbeddedMobileApp(), MobileAppAuthPayload, MobileAppBridge, notifyMobileAppAuth(), postMobileAppMessage(), postToNativeBridge() (+4 more)

### Community 92 - "Community 92"
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 93 - "Community 93"
Cohesion: 0.26
Nodes (11): blend(), derive_row(), derive_ui_reasoning(), h2r(), is_dark(), lum(), on_color(), r2h() (+3 more)

### Community 94 - "Community 94"
Cohesion: 0.17
Nodes (14): @radix-ui/react-label, @radix-ui/react-slot, react-hook-form, FormControl, FormDescription, FormField(), FormFieldContext, FormFieldContextValue (+6 more)

### Community 95 - "Community 95"
Cohesion: 0.21
Nodes (14): buildTemporaryMessage(), logConversationDebug(), mergeAssistantReply(), OpenSessionOptions, OpenSessionResult, useAiConversation(), UseAiConversationOptions, AiConversationSyncState (+6 more)

### Community 96 - "Community 96"
Cohesion: 0.28
Nodes (13): CookieConsentContext, CookieConsentContextValue, CookieConsentProvider(), acceptAllConsent(), buildConsentRecord(), CookieConsentRecord, isConsentExpired(), isConsentVersionStale() (+5 more)

### Community 97 - "Community 97"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 99 - "Community 99"
Cohesion: 0.15
Nodes (7): AVISO_SECTIONS, contentPath, __dirname, generateContentTs(), pagePath, ROOT, serializeValue()

### Community 100 - "Community 100"
Cohesion: 0.20
Nodes (11): @stripe/stripe-js, useStripeConfig(), mapPago(), normalizeRefundState(), paymentsApi, toNumber(), toStringValue(), UnknownRecord (+3 more)

### Community 101 - "Community 101"
Cohesion: 0.37
Nodes (11): OrderFieraPointsTotals(), Row(), getFieraPointsEarnNote(), getFieraPointsRedemptionDetail(), getOrderCashPaidAmount(), getOrderMerchandiseTotal(), getOrderPaymentComposition(), fullPoints (+3 more)

### Community 102 - "Community 102"
Cohesion: 0.24
Nodes (12): JerseyPreview(), JerseyPreviewProps, isSamePersonalization(), PersonalizationPanel(), PersonalizationPanelProps, presets, PERSONALIZATION_FEE_MXN, buildCustomPersonalization() (+4 more)

### Community 103 - "Community 103"
Cohesion: 0.20
Nodes (13): Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+5 more)

### Community 104 - "Community 104"
Cohesion: 0.31
Nodes (12): appendScript(), getActiveScriptProviders(), getEnvValue(), loadClarity(), loadConsentedScripts(), loaded, LoadedScripts, loadGa4() (+4 more)

### Community 106 - "Community 106"
Cohesion: 0.23
Nodes (4): generate_html(), get_deliverable_info(), get_image_base64(), main()

### Community 107 - "Community 107"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 108 - "Community 108"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 109 - "Community 109"
Cohesion: 0.17
Nodes (11): $type, $value, dark, semantic, $schema, $type, $value, semantic (+3 more)

### Community 110 - "Community 110"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, genkit-cli, @playwright/test, postcss, tailwindcss, @types/google.maps (+4 more)

### Community 111 - "Community 111"
Cohesion: 0.17
Nodes (12): scripts, build, deploy:frontend, dev, genkit:dev, genkit:watch, lint, start (+4 more)

### Community 112 - "Community 112"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 113 - "Community 113"
Cohesion: 0.20
Nodes (11): buildRetryDeliveryValuesFromCheckoutError(), CardPaymentStep(), getCheckoutErrorMessage(), MobileCheckoutActions(), setActiveCheckoutAttemptId(), getMyWallet(), formatUnavailableItemLine(), getUnavailableItemsFromError() (+3 more)

### Community 114 - "Community 114"
Cohesion: 0.24
Nodes (10): CATEGORY_LABELS, metadata, PoliticaCookiesPage(), COOKIE_REGISTRY, EXTERNAL_SCRIPTS, ExternalScript, getRegistryByCategory(), NECESSARY_THIRD_PARTIES (+2 more)

### Community 115 - "Community 115"
Cohesion: 0.21
Nodes (11): applyConsent(), cleanupNonEssentialStorage(), clearLocalStorageKeys(), deleteCookie(), markScriptsUnloaded(), NON_ESSENTIAL_COOKIES, NON_ESSENTIAL_LOCAL_STORAGE, THIRD_PARTY_COOKIE_PREFIXES (+3 more)

### Community 116 - "Community 116"
Cohesion: 0.33
Nodes (11): EventSurface, externalReferrerHost(), resolveAttribution(), send(), trackAddToCart(), trackPurchase(), trackSearch(), trackStorePageView() (+3 more)

### Community 117 - "Community 117"
Cohesion: 0.23
Nodes (9): normalizeCategories(), parseConsentRecord(), serializeConsentRecord(), clearConsentCookie(), getCookieOptions(), readConsentFromRequestCookie(), writeConsentToDocument(), CONSENT_MAX_AGE_SECONDS (+1 more)

### Community 118 - "Community 118"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 119 - "Community 119"
Cohesion: 0.18
Nodes (11): fast, normal, slow, $type, $value, $type, $value, primitive (+3 more)

### Community 120 - "Community 120"
Cohesion: 0.27
Nodes (7): AiChatComposer(), AiChatComposerProps, QuickPrompt, AssistantComposer(), CanvasPoint, PlaceholdersAndVanishInput(), PlaceholdersAndVanishInputProps

### Community 121 - "Community 121"
Cohesion: 0.24
Nodes (9): CookieCategory, APP_MODE_BLOCKED_LOCAL_STORAGE, cleanupTrackingStorage(), clearLocalStorageKeys(), deleteCookie(), APP_MODE_COOKIE_ALLOWLIST, BLOCKED_TRACKING_COOKIE_PREFIXES, BLOCKED_TRACKING_DOMAINS (+1 more)

### Community 122 - "Community 122"
Cohesion: 0.20
Nodes (4): categories, products, ImagePlaceholder, PlaceHolderImages

### Community 124 - "Community 124"
Cohesion: 0.29
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 125 - "Community 125"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 127 - "Community 127"
Cohesion: 0.31
Nodes (8): motion, getDesktopTileClass(), getUniqueImages(), ProductGallery(), ProductGalleryFrame(), CarouselApi, Lens(), LensProps

### Community 128 - "Community 128"
Cohesion: 0.38
Nodes (6): DELETE(), forward(), GET(), POST(), PUT(), buildLoyaltyBackendPath()

### Community 129 - "Community 129"
Cohesion: 0.42
Nodes (7): FieraPointsPayment(), canSelectFieraPoints(), getCheckoutPayableTotal(), getFieraPointsQuoteMessage(), hybridQuote, FieraPointsQuote, FieraPointsRequest

### Community 130 - "Community 130"
Cohesion: 0.31
Nodes (7): ActiveFilterChip, ActiveFilterChips(), ActiveFilterChipsProps, ProductToolbar(), ProductToolbarProps, BreadcrumbItem, Breadcrumbs()

### Community 131 - "Community 131"
Cohesion: 0.29
Nodes (8): ApiEnvelope, LineasReadOptions, mapLinea(), mapLineasList(), toBoolean(), toNumber(), toStringValue(), UnknownRecord

### Community 132 - "Community 132"
Cohesion: 0.33
Nodes (8): ApiEnvelope, mapTalla(), mapTallaInventorySnapshot(), mapTallasList(), toNumber(), toStringValue(), UnknownRecord, TallaInventorySnapshot

### Community 137 - "Community 137"
Cohesion: 0.33
Nodes (7): @react-three/fiber, three, Antigravity(), AntigravityInner(), hexToNormalizedRGB(), Silk(), SilkPlane

### Community 138 - "Community 138"
Cohesion: 0.42
Nodes (8): DELETE(), forward(), GET(), getSuffix(), PATCH(), POST(), PUT(), shouldRequireAuth()

### Community 139 - "Community 139"
Cohesion: 0.42
Nodes (8): DELETE(), forward(), GET(), getSuffix(), PATCH(), POST(), PUT(), shouldRequireAuth()

### Community 140 - "Community 140"
Cohesion: 0.44
Nodes (8): DELETE(), forward(), GET(), getSuffix(), PATCH(), POST(), PUT(), shouldRequireAuth()

### Community 141 - "Community 141"
Cohesion: 0.42
Nodes (8): DELETE(), forward(), GET(), getSuffix(), PATCH(), POST(), PUT(), shouldRequireAuth()

### Community 142 - "Community 142"
Cohesion: 0.36
Nodes (8): CategoryCard(), CategoryMarquee(), CategoryMarqueeProps, CategoryPresentation, CategoryRow(), getCategoryPresentation(), normalizeCategoryValue(), splitRows()

### Community 143 - "Community 143"
Cohesion: 0.22
Nodes (8): ClubLeonBridge, ClubLeonWebkitBridge, google.maps, google.maps.places, PlacePredictionSelectEvent, PlacesLibrary, TiendaAuthBridge, Window

### Community 146 - "Community 146"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), shouldRequireAuth()

### Community 147 - "Community 147"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), shouldRequireAuth()

### Community 148 - "Community 148"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), requiresAuthForPath()

### Community 149 - "Community 149"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), requiresAuthForPath()

### Community 150 - "Community 150"
Cohesion: 0.50
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), shouldRequireAuth()

### Community 151 - "Community 151"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), shouldRequireAuth()

### Community 152 - "Community 152"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), shouldRequireAuth()

### Community 153 - "Community 153"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), shouldRequireAuth()

### Community 154 - "Community 154"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), shouldRequireAuth()

### Community 155 - "Community 155"
Cohesion: 0.54
Nodes (7): DELETE(), forward(), GET(), getStripePublishableKey(), getSuffix(), POST(), PUT()

### Community 156 - "Community 156"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), shouldRequireAuth()

### Community 157 - "Community 157"
Cohesion: 0.46
Nodes (7): DELETE(), forward(), GET(), getSuffix(), POST(), PUT(), shouldRequireAuth()

### Community 158 - "Community 158"
Cohesion: 0.25
Nodes (7): ActualizarNoticiaDTO, ApiSuccess, CategoriaNoticia, CrearNoticiaDTO, IAContenido, Noticia, noticiasApi

### Community 159 - "Community 159"
Cohesion: 0.43
Nodes (3): candidateFromObject(), extractMemberIdFromQr(), KeyboardWedgeBuffer

### Community 162 - "Community 162"
Cohesion: 0.52
Nodes (6): DELETE(), forward(), GET(), getSuffix(), POST(), PUT()

### Community 163 - "Community 163"
Cohesion: 0.52
Nodes (6): DELETE(), forward(), GET(), getSuffix(), POST(), PUT()

### Community 164 - "Community 164"
Cohesion: 0.52
Nodes (6): DELETE(), forward(), GET(), getSuffix(), POST(), PUT()

### Community 165 - "Community 165"
Cohesion: 0.52
Nodes (6): DELETE(), forward(), GET(), getSuffix(), POST(), PUT()

### Community 166 - "Community 166"
Cohesion: 0.57
Nodes (6): DELETE(), forward(), GET(), getSuffix(), POST(), PUT()

### Community 167 - "Community 167"
Cohesion: 0.38
Nodes (5): ApiEnvelope, mapCategoriesList(), mapCategory(), toStringValue(), UnknownRecord

### Community 169 - "Community 169"
Cohesion: 0.60
Nodes (5): DELETE(), forward(), GET(), getSuffix(), POST()

### Community 170 - "Community 170"
Cohesion: 0.60
Nodes (5): forward(), GET(), getSuffix(), POST(), requiresAuthForPath()

### Community 171 - "Community 171"
Cohesion: 0.47
Nodes (5): getItemName(), OrderItemRow(), OrderItemsList(), OrderItemsListProps, OrdenItem

### Community 172 - "Community 172"
Cohesion: 0.40
Nodes (4): fetchOfertasActivasAdmin(), fetchOfertasAdmin(), OfertaBannerOption, OfertasListResponse

### Community 173 - "Community 173"
Cohesion: 0.53
Nodes (5): mapProveedor(), mapProveedorList(), toBoolean(), toStringValue(), UnknownRecord

### Community 174 - "Community 174"
Cohesion: 0.70
Nodes (4): forward(), GET(), getSuffix(), POST()

### Community 175 - "Community 175"
Cohesion: 0.70
Nodes (4): forward(), GET(), getSuffix(), POST()

### Community 176 - "Community 176"
Cohesion: 0.70
Nodes (4): forward(), GET(), getSuffix(), POST()

### Community 177 - "Community 177"
Cohesion: 0.60
Nodes (4): StaffLandingPage(), workspaceFor(), puedeAsignarPuntos(), UserRole

### Community 178 - "Community 178"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 179 - "Community 179"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 180 - "Community 180"
Cohesion: 0.50
Nodes (3): extends, next/core-web-vitals, next/typescript

### Community 182 - "Community 182"
Cohesion: 0.67
Nodes (3): getSiteUrl(), sitemap(), STATIC_ROUTES

## Knowledge Gaps
- **809 isolated node(s):** `PaymentProvider`, `DateValue`, `Galeria`, `PendingImageUpload`, `PendingVideoUpload` (+804 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1158 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Community 10` to `Community 128`, `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 2`, `Community 6`, `Community 130`, `Community 8`, `Community 27`, `Community 138`, `Community 139`, `Community 140`, `Community 141`, `Community 14`, `Community 15`, `Community 142`, `Community 146`, `Community 19`, `Community 147`, `Community 148`, `Community 149`, `Community 150`, `Community 151`, `Community 25`, `Community 152`, `Community 153`, `Community 154`, `Community 155`, `Community 156`, `Community 157`, `Community 26`, `Community 32`, `Community 162`, `Community 163`, `Community 164`, `Community 165`, `Community 166`, `Community 39`, `Community 40`, `Community 169`, `Community 170`, `Community 42`, `Community 33`, `Community 171`, `Community 174`, `Community 175`, `Community 176`, `Community 177`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 182`, `Community 54`, `Community 55`, `Community 60`, `Community 64`, `Community 70`, `Community 73`, `Community 74`, `Community 41`, `Community 82`, `Community 83`, `Community 85`, `Community 87`, `Community 89`, `Community 43`, `Community 18`, `Community 20`, `Community 102`, `Community 114`, `Community 127`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **What connects `PaymentProvider`, `DateValue`, `Galeria` to the rest of the system?**
  _809 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06390434961863534 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 130`, `Community 7`, `Community 8`, `Community 137`, `Community 10`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 20`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 30`, `Community 32`, `Community 33`, `Community 34`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 50`, `Community 52`, `Community 53`, `Community 181`, `Community 54`, `Community 55`, `Community 57`, `Community 59`, `Community 60`, `Community 64`, `Community 69`, `Community 70`, `Community 73`, `Community 79`, `Community 80`, `Community 94`, `Community 95`, `Community 96`, `Community 100`, `Community 102`, `Community 103`, `Community 112`, `Community 120`, `Community 127`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04201680672268908 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Community 1` to `Community 0`, `Community 129`, `Community 2`, `Community 3`, `Community 4`, `Community 130`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 15`, `Community 19`, `Community 20`, `Community 27`, `Community 32`, `Community 33`, `Community 40`, `Community 41`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 55`, `Community 60`, `Community 69`, `Community 70`, `Community 73`, `Community 79`, `Community 84`, `Community 89`, `Community 94`, `Community 102`, `Community 112`, `Community 120`, `Community 127`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.056790123456790124 - nodes in this community are weakly interconnected._