// Suggestions only: the editor accepts any make or specification so new and regional vehicles remain listable.
export const vehicleMakes = [
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "BAIC", "Bentley", "BMW", "Buick", "BYD",
  "Cadillac", "Changan", "Chery", "Chevrolet", "Chrysler", "Citroën", "Dacia", "Daewoo",
  "Daihatsu", "Dodge", "Dongfeng", "DS Automobiles", "FAW", "Ferrari", "Fiat", "Ford",
  "Foton", "GAC", "Geely", "Genesis", "GMC", "Great Wall", "Haval", "Honda", "Hyundai",
  "Infiniti", "Isuzu", "JAC", "Jaguar", "Jeep", "Jetour", "Kia", "Lada", "Land Rover",
  "Lexus", "Lincoln", "Lotus", "Mahindra", "Maserati", "Mazda", "Mercedes-Benz", "MG",
  "MINI", "Mitsubishi", "Nissan", "Opel", "Peugeot", "Polestar", "Porsche", "Proton",
  "RAM", "Renault", "Rivian", "SEAT", "Škoda", "Smart", "SsangYong", "Subaru", "Suzuki",
  "Tata", "Tesla", "Toyota", "Volkswagen", "Volvo", "Wuling",
] as const;

export const fuelTypes = ["Gasoline", "Diesel", "Hybrid", "Plug-in hybrid", "Electric", "LPG", "CNG", "Hydrogen", "Flex fuel"] as const;
export const transmissionTypes = ["Automatic", "Manual", "CVT", "DCT", "AMT", "Semi-automatic", "Single-speed"] as const;
export const bodyTypes = ["SUV", "Crossover", "Sedan", "Hatchback", "Pickup", "Van", "Minivan", "MPV", "Wagon", "Coupe", "Convertible", "Roadster", "Fastback", "Liftback", "Truck", "Bus", "Off-road", "Sports car", "Commercial"] as const;
export const driveTypes = ["FWD", "RWD", "AWD", "4WD", "4x4"] as const;
export const vehicleColors = ["Black", "White", "Silver", "Gray", "Blue", "Red", "Green", "Brown", "Beige", "Gold", "Yellow", "Orange", "Purple"] as const;
export const currencies = ["USD", "SRD", "EUR"] as const;
