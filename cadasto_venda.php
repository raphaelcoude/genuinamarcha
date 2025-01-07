
<?php

require 'conect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {


$nome = $_POST["nome"];
$pai = $_POST["pai"];
$mae = $_POST["mae"];
$raca = $_POST["raca"];
$pelagem = $_POST["pelagem"];
$idade = $_POST["idade"];



$sql = "INSERT INTO cavalos (nome,pai,mae,raca,pelagem,idade) values ('$nome','$pai','$mae','$raca','$pelagem','$idade')";



if (mysqli_query($conn, $sql)) {
    echo '<br>';
    echo 'Cadastro efetuado com sucesso ';
  
  } else {  
  
      echo" falha na conexao" . mysqli_error( $conn);
  
  }

}
