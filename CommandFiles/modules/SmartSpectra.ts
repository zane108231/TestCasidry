import { FontSystem } from "cassidy-styler";
import { InventoryItem } from "./cassidyUser";
import { Inventory } from "@cassidy/ut-shop";

export const smartSpectra = `🎓 ${FontSystem.fonts.bold_italic(
  "SMART"
)}${FontSystem.fonts.fancy_italic("Spectra")}`;

export namespace SmartPet {
  export function convertHealToSaturationRange(
    heal: number | unknown
  ): [number, number] {
    const sat1 = (Number(heal) || 0) * 1.2 * 60 * 1000;

    const satMin = Math.floor(sat1 * 0.25);
    const satMax = Math.floor(sat1 * 1);

    return [satMin, satMax];
  }

  export function getFoodPts(item: InventoryItem) {
    if (typeof item.heal === "number") {
      const satus = convertHealToSaturationRange(item.heal);
      if (satus.some((i) => isNaN(i))) {
        return 0;
      }
      return (satus[0] + satus[1]) * 0.2;
    }
    if (typeof item.saturation === "number") {
      return item.saturation;
    }
    return 0;
  }

  export function findHungryPets(pets: Inventory) {
    return Array.from(pets).sort((petA, petB) => {
      const {
        lastFeed: lastFeedA = Date.now(),
        lastSaturation: lastSaturationA = 0,
      } = petA;
      const {
        lastFeed: lastFeedB = Date.now(),
        lastSaturation: lastSaturationB = 0,
      } = petB;

      const timeSinceLastFeedA = Date.now() - Number(lastFeedA);
      const timeSinceLastFeedB = Date.now() - Number(lastFeedB);

      const hungerLevelA = timeSinceLastFeedA - Number(lastSaturationA);
      const hungerLevelB = timeSinceLastFeedB - Number(lastSaturationB);

      return hungerLevelB - hungerLevelA;
    });
  }

  export function isFeedable(pet: InventoryItem, food: InventoryItem): boolean {
    return (
      food.type === `${pet.petType}_food` ||
      food.type === "anypet_food" ||
      food.type === "food"
    );
  }

  export function findFoods(pet: InventoryItem, inv: Inventory) {
    const sorted = Array.from(inv)
      .filter((i) => isFeedable(pet, i))
      .toSorted((a, b) => getFoodPts(b) - getFoodPts(a));
    return sorted;
  }

  export function findFood(pet: InventoryItem, inv: Inventory) {
    return findFoods(pet, inv)[0];
  }

  export function findHungryFeedable(pets: Inventory, inv: Inventory) {
    const hungryPets = findHungryPets(pets);

    const sortedHungryPetsWithFood = hungryPets.map((pet) => {
      const suitableFood = findFood(pet, inv);
      return { pet, food: suitableFood };
    });

    const sortedResult = sortedHungryPetsWithFood.sort((a, b) => {
      const hungerDifference =
        Date.now() -
        Number(a.pet.lastFeed) -
        Number(a.pet.lastSaturation) -
        (Date.now() - Number(b.pet.lastFeed) - Number(b.pet.lastSaturation));

      if (hungerDifference !== 0) {
        return hungerDifference;
      }

      return getFoodPts(b.food) - getFoodPts(a.food);
    });

    return sortedResult;
  }
}
