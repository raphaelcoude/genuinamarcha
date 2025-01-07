<?php 

$host = 'localhost';
$user = 'root';
$senha = "";
$database = "genuina";


$conn = mysqli_connect($host, $user, $senha, $database);

if (!$conn) {
    die("Falha na coenxão.". mysqli_connect_error());
} else {
    echo"Conectado com sucesso" ;
}