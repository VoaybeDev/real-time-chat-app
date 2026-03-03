const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    // Vérification de l'en-tête Authorization
    const authHeader = req.headers.authorization;

    // Vérifie si le token est fourni et commence par "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant ou malformé" });
    }

    // Extraction du token du header
    const token = authHeader.split(" ")[1];

    // Vérification de la validité du token avec la clé secrète
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({ message: "Token invalide" });
    }

    // Recherche de l'utilisateur dans la base de données
    const user = await User.findById(decoded.userId).select("-password");

    // Si l'utilisateur n'existe pas
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    // Ajout de l'utilisateur à la requête pour un usage ultérieur
    req.user = user;

    // Passage au prochain middleware/route
    next();
  } catch (err) {
    console.error("Auth error:", err.message);

    // Si le token est invalide ou expiré
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};