const params = new URLSearchParams(window.location.search);
const plantKey = params.get("plant");
const plant = plantData[plantKey];

if (plant) {
  document.getElementById("plant-title").innerText = plant.name;
  document.getElementByID("latin-name").innerText = plant.latin;
  document.getElementById("plant-img").src = plant.image;
  document.getElementById("plant-img").alt = plant.name;
  document.getElementById("plant-info").innerText = plant.info;
  document.getElementById("plant-recipe").innerText = plant.recipe;
} else {
  // handle no plant found case
  document.querySelector(".plant-details").innerHTML = "<p>Plant niet gevonden.</p>";
}



const recipes = {
    plant1: {
        title: "Recept voor Plant 1",
        text: "Voor Plant 1, combineer de bladeren met een beetje olijfolie, knoflook en kruiden."
    },
    plant2: {
        title: "Recept voor Plant 2",
        text: "Plant 2 is geweldig in salades. Meng met komkommer, tomaten en een simpele vinaigrette."
    },
    plant3: {
        title: "Recept voor Plant 3",
        text: "Plant 3 is ideaal voor een kruidige soep. Voeg wat wortelen, ui en kruiden toe."
    }
};

function showRecipe(plant) {
    const recipe = recipes[plant];
    document.getElementById('recipe-title').innerText = recipe.title;
    document.getElementById('recipe-text').innerText = recipe.text;
    document.getElementById('recipe-modal').style.display = "flex";
}

function closeRecipe() {
    document.getElementById('recipe-modal').style.display = "none";
}

