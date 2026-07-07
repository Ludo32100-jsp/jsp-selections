/* ============================
   --- Firebase ---
   ============================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// --- Config Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyBK9tDAwNZZ-qg1fDr2eCTQNbfcQzST72w",
  authDomain: "selections-jsp.firebaseapp.com",
  databaseURL: "https://selections-jsp-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "selections-jsp",
  storageBucket: "selections-jsp.firebasestorage.app",
  messagingSenderId: "387918934707",
  appId: "1:387918934707:web:a154b6f0239f0c5d5676c6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Année sélectionnée ---
let anneeCourante = "2026";

// --- Caches temps réel ---
let candidatsCache = [];
let resultatsCache = {}; // { candidatId: { epreuve: { valeur, points } } }

/* ============================
   BARÈMES AUTOMATIQUES
   ============================ */

function afficherBareme(epreuve) {
  const box = document.getElementById("baremeInfo");
  const content = document.getElementById("baremeContent");

  if (!box || !content) return;

  if (epreuve === "Écrit" || epreuve === "Oral") {
    box.style.display = "none";
    content.innerHTML = "";
    return;
  }

  box.style.display = "block";

  let txt = "";

  switch(epreuve) {
    case "Luc Léger":
      txt = `
        Homme : Min 0 → Max 7 (20 pts)<br>
        Femme : Min 0 → Max 5 (20 pts)<br>
        Progression linéaire
      `;
      break;

    case "Tractions":
      txt = `
        Homme : Min 0 → Max 10 (20 pts)<br>
        Femme : Min 0 → Max 5 (20 pts)<br>
        Progression linéaire
      `;
      break;

    case "Pompes":
      txt = `
        Homme : Min 0 → Max 25 (20 pts)<br>
        Femme : Min 0 → Max 15 (20 pts)<br>
        Progression linéaire
      `;
      break;

    case "Souplesse":
      txt = `
        Homme : Min 0 cm → Max 47 cm (20 pts)<br>
        Femme : Min 0 cm → Max 51 cm (20 pts)<br>
        Progression linéaire
      `;
      break;

    case "Gainage":
      txt = `
        Homme : Min 1'10 → Max 4'00 (20 pts)<br>
        Femme : Min 1'00 → Max 4'00 (20 pts)<br>
        Progression linéaire
      `;
      break;

    case "Squats":
      txt = `
        Homme : Min 1 → Max 60 (20 pts)<br>
        Femme : Min 3 → Max 60 (20 pts)<br>
        Progression linéaire
      `;
      break;
  }

  content.innerHTML = txt;
}

/* ============================
   GESTION DES CANDIDATS
   ============================ */

function calculAge(dateNaissance) {
  const naissance = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - naissance.getFullYear();
  const m = today.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < naissance.getDate())) {
    age--;
  }
  return age;
}

function ajouterCandidat() {
  const prenom = document.getElementById("prenom").value.trim();
  const nom = document.getElementById("nom").value.trim();
  const dateNaissance = document.getElementById("dateNaissance").value;
  const sexe = document.getElementById("sexe").value;
  const adresse = document.getElementById("adresse").value.trim();
  const codePostal = document.getElementById("codePostal").value.trim();
  const ville = document.getElementById("ville").value.trim();
  const telephone = document.getElementById("telephone").value.trim();
  const mail = document.getElementById("mail").value.trim();

  if (!prenom || !nom || !dateNaissance || !sexe) {
    alert("Merci de remplir au minimum : prénom, nom, date de naissance et sexe.");
    return;
  }

  const age = calculAge(dateNaissance);
  const id = Date.now();

  const candidat = {
    id,
    prenom,
    nom,
    dateNaissance,
    sexe,
    adresse,
    codePostal,
    ville,
    telephone,
    mail,
    age
  };

  set(ref(db, `candidats/${anneeCourante}/${id}`), candidat);
}
/* ============================
   SUPPRESSION D'UN CANDIDAT
   ============================ */

function supprimerCandidat(id) {
  if (!confirm("Supprimer ce candidat ?")) return;

  remove(ref(db, `candidats/${anneeCourante}/${id}`));
  remove(ref(db, `resultats/${anneeCourante}/${id}`));
}

/* ============================
   AFFICHAGE DES CANDIDATS
   ============================ */

function afficherCandidats() {
  const liste = document.getElementById("liste-candidats");
  if (!liste) return;

  let html = "<ul>";

  candidatsCache.forEach(c => {
    html += `
      <li class="candidat-card">
        <strong>${c.prenom} ${c.nom}</strong> (${c.age} ans)
        <br>
        Sexe : ${c.sexe}
        <br>
        Né(e) le : ${c.dateNaissance}
        <br>
        ${c.adresse}, ${c.codePostal} ${c.ville}
        <br>
        Tel : ${c.telephone}
        <br>
        Mail : ${c.mail}
        <br><br>

        <button class="btn-delete" onclick="supprimerCandidat(${c.id})">
          Supprimer
        </button>
      </li>
      <hr>
    `;
  });

  html += "</ul>";
  liste.innerHTML = html;
}

/* ============================
   REMPLIR SELECT DES CANDIDATS
   ============================ */

function remplirSelectCandidats() {
  const select = document.getElementById("candidatSelect");
  if (!select) return;

  select.innerHTML = "";

  candidatsCache.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.prenom} ${c.nom}`;
    select.appendChild(opt);
  });
}

/* ============================
   GESTION DES EPREUVES / RÉSULTATS
   ============================ */

function calculPoints(epreuve, valeur, sexe) {
  let pts = 0;
  const v = Number(valeur) || 0;

  switch (epreuve) {
    case "Luc Léger":
      pts = sexe === "M" ? (v / 7) * 20 : (v / 5) * 20;
      break;

    case "Tractions":
      pts = sexe === "M" ? (v / 10) * 20 : (v / 5) * 20;
      break;

    case "Pompes":
      pts = sexe === "M" ? (v / 25) * 20 : (v / 15) * 20;
      break;

    case "Souplesse":
      pts = sexe === "M" ? (v / 47) * 20 : (v / 51) * 20;
      break;

    case "Gainage":
      pts = sexe === "M"
        ? ((v - 70) / (240 - 70)) * 20
        : ((v - 60) / (240 - 60)) * 20;
      break;

    case "Squats":
      pts = sexe === "M"
        ? ((v - 1) / (60 - 1)) * 20
        : ((v - 3) / (60 - 3)) * 20;
      break;

    case "Écrit":
    case "Oral":
      pts = (v / 25) * 20;
      break;
  }

  return Math.max(0, Math.min(20, Number(pts.toFixed(2))));
}

function enregistrerResultat() {
  const candidatId = Number(document.getElementById("candidatSelect").value);
  const epreuve = document.getElementById("epreuveSelect").value;

  let valeur;

  if (epreuve === "Gainage") {
    const min = Number(document.getElementById("gainageMin").value) || 0;
    const sec = Number(document.getElementById("gainageSec").value) || 0;
    valeur = (min * 60) + sec;
  } else {
    valeur = Number(document.getElementById("valeurEpreuve").value);
  }

  if (!candidatId || !epreuve || valeur === "") {
    alert("Merci de choisir un candidat, une épreuve et de saisir une valeur.");
    return;
  }

  const candidat = candidatsCache.find(c => c.id === candidatId);
  if (!candidat) {
    alert("Candidat introuvable.");
    return;
  }

  const points = calculPoints(epreuve, valeur, candidat.sexe);

  set(ref(db, `resultats/${anneeCourante}/${candidatId}/${epreuve}`), {
    valeur,
    points
  });
}

function calculTotalCandidat(candidatId) {
  const resCandidat = resultatsCache[candidatId] || {};
  const liste = Object.values(resCandidat);

  const totalBrut = liste.reduce((sum, r) => sum + (r.points || 0), 0);
  const note20 = (totalBrut / 160) * 20;

  return {
    totalBrut: Number(totalBrut.toFixed(2)),
    note20: Number(note20.toFixed(2)),
    resultats: resCandidat
  };
}

function afficherResultatsCandidat(candidatId) {
  const bloc = document.getElementById("resultats-epreuves");
  if (!bloc) return;

  const data = calculTotalCandidat(candidatId);

  let html = "<h3>Résultats des épreuves</h3><ul>";

  Object.entries(data.resultats).forEach(([epreuve, r]) => {
    html += `
      <li>
        <strong>${epreuve}</strong> : ${r.valeur} → ${r.points} pts
      </li>
    `;
  });

  html += "</ul>";
  html += `<p><strong>Total brut :</strong> ${data.totalBrut} pts</p>`;
  html += `<p><strong>Note finale :</strong> ${data.note20} / 20</p>`;

  bloc.innerHTML = html;
}

/* ============================
   CLASSEMENT AUTOMATIQUE
   ============================ */

function afficherClassement() {
  const body = document.getElementById("classementBody");
  if (!body) return;

  body.innerHTML = "";

  const classement = candidatsCache.map(c => {
    const data = calculTotalCandidat(c.id);
    return {
      prenom: c.prenom,
      nom: c.nom,
      total: data.totalBrut,
      note: data.note20
    };
  }).sort((a, b) => b.note - a.note);

  classement.forEach((c, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${c.nom}</td>
      <td>${c.prenom}</td>
      <td>${c.note}</td>
    `;
    body.appendChild(row);
  });

  colorerClassement();
}

function colorerClassement() {
  const rows = document.querySelectorAll("#classementBody tr");

  rows.forEach((row, index) => {
    const position = index + 1;

    if (position <= 12) {
      row.style.backgroundColor = "rgba(0, 200, 0, 0.25)";
    } else if (position >= 13 && position <= 18) {
      row.style.backgroundColor = "rgba(255, 165, 0, 0.25)";
    } else {
      row.style.backgroundColor = "rgba(255, 0, 0, 0.25)";
    }
  });
}
/* ============================
   SYNCHRO TEMPS RÉEL FIREBASE
   ============================ */

function chargerAnnee(annee) {
  anneeCourante = annee;

  // Candidats
  onValue(ref(db, `candidats/${anneeCourante}`), (snapshot) => {
    const data = snapshot.val() || {};
    candidatsCache = Object.values(data);
    afficherCandidats();
    afficherClassement();
    remplirSelectCandidats();
  });

  // Résultats
  onValue(ref(db, `resultats/${anneeCourante}`), (snapshot) => {
    resultatsCache = snapshot.val() || {};
    afficherClassement();

    const select = document.getElementById("candidatSelect");
    if (select && select.value) {
      afficherResultatsCandidat(Number(select.value));
    }
  });
}

/* ============================
   ANNEES DYNAMIQUES
   ============================ */

function remplirAnneesDynamiques() {
  const selectAnnee = document.getElementById("anneeSelect");
  if (!selectAnnee) return;

  const startYear = 2026;
  const currentYear = new Date().getFullYear();

  selectAnnee.innerHTML = "";

  for (let y = startYear; y <= currentYear + 5; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    selectAnnee.appendChild(opt);
  }
}

/* ============================
   INIT + RESET + BARÈMES
   ============================ */

document.addEventListener("DOMContentLoaded", () => {

  // 🟩 Remplissage automatique des années
  remplirAnneesDynamiques();

  const selectAnnee = document.getElementById("anneeSelect");
  if (selectAnnee) {
    anneeCourante = selectAnnee.value;

    selectAnnee.addEventListener("change", () => {
      chargerAnnee(selectAnnee.value);
    });
  }

  const epreuveSelect = document.getElementById("epreuveSelect");
  const valeurInput = document.getElementById("valeurEpreuve");
  const gainageInputs = document.getElementById("gainageInputs");

  if (epreuveSelect && valeurInput && gainageInputs) {
    epreuveSelect.addEventListener("change", () => {
      afficherBareme(epreuveSelect.value);

      valeurInput.value = "";
      document.getElementById("gainageMin").value = "";
      document.getElementById("gainageSec").value = "";

      if (epreuveSelect.value === "Gainage") {
        valeurInput.style.display = "none";
        gainageInputs.style.display = "block";
      } else {
        valeurInput.style.display = "block";
        gainageInputs.style.display = "none";
      }
    });

    afficherBareme(epreuveSelect.value);
  }

  // Chargement initial
  chargerAnnee(anneeCourante);
});

// Exposer fonctions globales
window.ajouterCandidat = ajouterCandidat;
window.supprimerCandidat = supprimerCandidat;
window.enregistrerResultat = enregistrerResultat;
window.toggleMenu = () => {
  const menu = document.getElementById("mobileMenu");
  menu.classList.toggle("show");
};
// 👉 EXPORT PDF

window.exporterPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const titre = `Classement JSP - Année ${anneeCourante}`;
  const date = new Date().toLocaleDateString("fr-FR");

  doc.setFontSize(18);
  doc.text(titre, 14, 20);

  doc.setFontSize(12);
  doc.text(`Exporté le : ${date}`, 14, 28);

  const body = document.getElementById("classementBody");
  const rows = [...body.querySelectorAll("tr")].map(tr => {
    const cells = tr.querySelectorAll("td");
    return [
      cells[0].textContent,
      cells[1].textContent,
      cells[2].textContent,
      cells[3].textContent
    ];
  });

  doc.autoTable({
    startY: 40,
    head: [["Rang", "Nom", "Prénom", "Note"]],
    body: rows,
    styles: { halign: "center" },
    headStyles: { fillColor: [0, 0, 0] },
    didParseCell: function (data) {
      const rowIndex = data.row.index + 1;

      if (rowIndex <= 12) {
        data.cell.styles.fillColor = [0, 200, 0];
      } else if (rowIndex >= 13 && rowIndex <= 18) {
        data.cell.styles.fillColor = [255, 165, 0];
      } else {
        data.cell.styles.fillColor = [255, 0, 0];
      }
    }
  });

  doc.save(`classement_${anneeCourante}.pdf`);
};
