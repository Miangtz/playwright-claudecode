Feature: Búsqueda de productos en adidas México
  Como visitante de la tienda adidas México
  Quiero poder buscar productos por nombre o categoría
  Para encontrar artículos específicos rápidamente

  Scenario: Buscar un producto muestra resultados relevantes
    Given que estoy en la página de inicio de adidas México
    When busco el término "running"
    Then veo una lista de productos en los resultados

  Scenario: Ver la ficha completa de un producto desde los resultados de búsqueda
    Given que busqué "ultraboost" en adidas México
    When hago clic en el primer producto de los resultados
    Then veo el nombre del producto y su precio
