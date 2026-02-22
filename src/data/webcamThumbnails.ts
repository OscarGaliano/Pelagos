/**
 * URLs de miniaturas reales de playas desde Wikimedia Commons.
 * Todas las imágenes son fotos reales de la playa o zona indicada (CC BY-SA / CC BY).
 * Formato: thumb 400px para preview.
 */
const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';

export const THUMB = {
  // Asturias - playas concretas
  playaSalinas: `${W}/d/d8/Playa_de_Salinas-La_Pe%C3%B1ona._02.jpg/400px-Playa_de_Salinas-La_Pe%C3%B1ona._02.jpg`,
  gijonSanLorenzo: `${W}/2/24/Gijon-playa_san_lorenzo_y_Cimadevilla.JPG/400px-Gijon-playa_san_lorenzo_y_Cimadevilla.JPG`,
  playaXago: `${W}/b/bc/Playa_de_Xago_%28Asturias%29.jpg/400px-Playa_de_Xago_%28Asturias%29.jpg`,
  playaPenarronda: `${W}/1/19/Playa_Penarronda_%28Asturias%29.jpg/400px-Playa_Penarronda_%28Asturias%29.jpg`,
  cudillero: `${W}/f/f3/Cudillero_%2889009791%29.jpeg/400px-Cudillero_%2889009791%29.jpeg`,
  playaRodiles: `${W}/3/3d/Playa_de_Rodiles.jpg/400px-Playa_de_Rodiles.jpg`,
  playaBorizuLlanes: `${W}/6/6c/Playa_de_Borizu.JPG/400px-Playa_de_Borizu.JPG`,
  // Cantabria / Santander
  santanderSardinero: `${W}/0/03/Santander_-_beach_4.jpg/400px-Santander_-_beach_4.jpg`,
  // Alicante / Benidorm
  benidorm: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  // Reutilizar por zona cuando no hay imagen específica de esa playa
  asturiasLlanes: `${W}/6/6c/Playa_de_Borizu.JPG/400px-Playa_de_Borizu.JPG`,
  asturiasGijon: `${W}/2/24/Gijon-playa_san_lorenzo_y_Cimadevilla.JPG/400px-Gijon-playa_san_lorenzo_y_Cimadevilla.JPG`,
  asturiasVillaviciosa: `${W}/3/3d/Playa_de_Rodiles.jpg/400px-Playa_de_Rodiles.jpg`,
  asturiasColunga: `${W}/6/6c/Playa_de_Borizu.JPG/400px-Playa_de_Borizu.JPG`,
  asturiasRibadesella: `${W}/3/3d/Playa_de_Rodiles.jpg/400px-Playa_de_Rodiles.jpg`,
  asturiasCaravia: `${W}/3/3d/Playa_de_Rodiles.jpg/400px-Playa_de_Rodiles.jpg`,
  asturiasGozon: `${W}/b/bc/Playa_de_Xago_%28Asturias%29.jpg/400px-Playa_de_Xago_%28Asturias%29.jpg`,
  asturiasCastropol: `${W}/1/19/Playa_Penarronda_%28Asturias%29.jpg/400px-Playa_Penarronda_%28Asturias%29.jpg`,
  asturiasNavia: `${W}/1/19/Playa_Penarronda_%28Asturias%29.jpg/400px-Playa_Penarronda_%28Asturias%29.jpg`,
  asturiasMurosNalon: `${W}/6/6c/Playa_de_Borizu.JPG/400px-Playa_de_Borizu.JPG`,
  asturiasRibadedeva: `${W}/6/6c/Playa_de_Borizu.JPG/400px-Playa_de_Borizu.JPG`,
  asturiasCastrillon: `${W}/d/d8/Playa_de_Salinas-La_Pe%C3%B1ona._02.jpg/400px-Playa_de_Salinas-La_Pe%C3%B1ona._02.jpg`,
  cantabria: `${W}/0/03/Santander_-_beach_4.jpg/400px-Santander_-_beach_4.jpg`,
  pontevedra: `${W}/6/6c/Playa_de_Borizu.JPG/400px-Playa_de_Borizu.JPG`,
  lugo: `${W}/1/19/Playa_Penarronda_%28Asturias%29.jpg/400px-Playa_Penarronda_%28Asturias%29.jpg`,
  alicante: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  santander: `${W}/0/03/Santander_-_beach_4.jpg/400px-Santander_-_beach_4.jpg`,
  // Canarias / otros (imagen representativa de playa española hasta tener específicas)
  tenerife: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  granCanaria: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  lanzarote: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  fuerteventura: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  baleares: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  formentera: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  barcelona: `${W}/0/03/Santander_-_beach_4.jpg/400px-Santander_-_beach_4.jpg`,
  girona: `${W}/6/6c/Playa_de_Borizu.JPG/400px-Playa_de_Borizu.JPG`,
  cadiz: `${W}/0/03/Santander_-_beach_4.jpg/400px-Santander_-_beach_4.jpg`,
  malaga: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  almeria: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  granada: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  castellon: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  murcia: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
  espana: `${W}/0/03/Santander_-_beach_4.jpg/400px-Santander_-_beach_4.jpg`,
  ibiza: `${W}/b/b4/Benidorm_beach.jpg/400px-Benidorm_beach.jpg`,
} as const;
