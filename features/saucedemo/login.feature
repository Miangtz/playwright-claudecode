Feature: Login en Sauce Demo
  Como usuario registrado
  Quiero poder iniciar sesión
  Para acceder a la tienda

  Scenario: Login exitoso con credenciales válidas
    Given que estoy en la página de login
    When ingreso el usuario "standard_user" y contraseña "secret_sauce"
    Then debería ver la página de productos

  Scenario: Login con contraseña incorrecta
    Given que estoy en la página de login
    When ingreso el usuario "standard_user" y contraseña "wrongpassword"
    Then debería ver el mensaje de error "Epic sadface: Username and password do not match any user in this service"

  Scenario: Login con usuario bloqueado
    Given que estoy en la página de login
    When ingreso el usuario "locked_out_user" y contraseña "secret_sauce"
    Then debería ver el mensaje de error "Epic sadface: Sorry, this user has been locked out."
