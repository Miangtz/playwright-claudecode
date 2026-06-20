Feature: Carrito de compras en Sauce Demo
  Como cliente de la tienda
  Quiero poder agregar productos al carrito
  Para poder comprarlos

  Scenario: Ver la lista de productos después de login
    Given que ingresé como "standard_user" con contraseña "secret_sauce"
    Then debería ver al menos un producto en la lista

  Scenario: Agregar un producto al carrito
    Given que ingresé como "standard_user" con contraseña "secret_sauce"
    When agrego el producto "Sauce Labs Backpack" al carrito
    Then el contador del carrito debería mostrar "1"

  Scenario: Agregar dos productos al carrito
    Given que ingresé como "standard_user" con contraseña "secret_sauce"
    When agrego el producto "Sauce Labs Backpack" al carrito
    And agrego el producto "Sauce Labs Bike Light" al carrito
    Then el contador del carrito debería mostrar "2"
