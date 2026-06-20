Feature: Navegación en adidas México
  Como visitante de la tienda adidas México
  Quiero poder navegar por la página principal
  Para encontrar los productos que me interesan

  Scenario: La página de inicio carga con los elementos principales
    Given que visito la página de inicio de adidas México
    Then el logo de adidas está visible
    And la barra de búsqueda está visible

  Scenario: Navegar a la sección de productos para hombre
    Given que estoy en la página de inicio de adidas México
    When hago clic en "Hombre" del menú principal
    Then la URL incluye "/hombre"

  Scenario: Acceder al formulario de inicio de sesión
    Given que estoy en la página de inicio de adidas México
    When hago clic en el enlace para iniciar sesión
    Then la URL incluye información de la cuenta
