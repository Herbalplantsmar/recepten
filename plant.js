const params = new URLSearchParams(window.location.search);
const plantKey = params.get("plant");
const plant = plantDatabase[plantKey];

if (plant) {
  document.getElementById("plant-name").innerText = plant.name;
  document.getElementById("latin-name").innerText = plant.latin;
  document.getElementById("plant-image").src = plant.image;
  document.getElementById("plant-image").alt = plant.name;
  document.getElementById("plant-recipe").innerText = plant.recipe;
  document.getElementById("plant-info").innerText = plant.info;
} else {
  document.body.innerHTML = "<h1>Plant niet gevonden.</h1><a href='index.html'>← Terug</a>";
}
