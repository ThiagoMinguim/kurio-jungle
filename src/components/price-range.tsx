import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { fromWei, toWei } from "../domain/money";
import { Button } from "./ui/button";
const STEP_WEI = 10n ** 16n;
const valueInEth = (tick: number) => fromWei(BigInt(tick) * STEP_WEI);
const tickFromEth = (value: string, fallback: number) => {
  try {
    return Math.max(0, Math.min(1250, Number(toWei(value) / STEP_WEI)));
  } catch {
    return fallback;
  }
};
/** Slider ticks are integer hundredths; monetary values remain exact decimal strings. */
export function PriceRange({
  min,
  max,
  suffix,
  onApply,
}: {
  min: string;
  max: string;
  suffix: string;
  onApply: (values: { min: string; max: string }) => void;
}) {
  const [range, setRange] = useState(() =>
    [tickFromEth(min, 0), tickFromEth(max, 1250)].sort((a, b) => a - b),
  );
  return (
    <form
      className="price-filter"
      onSubmit={(event) => {
        event.preventDefault();
        onApply({ min: valueInEth(range[0]), max: valueInEth(range[1]) });
      }}
    >
      <h3 id={`price-label-${suffix}`}>Faixa de preço</h3>
      <div className="price-range-values" aria-live="polite">
        <output>{valueInEth(range[0])} ETH</output>
        <span>até</span>
        <output>{valueInEth(range[1])} ETH</output>
      </div>
      <Slider.Root
        className="price-slider"
        min={0}
        max={1250}
        step={1}
        minStepsBetweenThumbs={1}
        value={range}
        onValueChange={setRange}
        aria-labelledby={`price-label-${suffix}`}
      >
        <Slider.Track className="price-track">
          <Slider.Range className="price-selected" />
        </Slider.Track>
        <Slider.Thumb
          className="price-thumb"
          aria-label="Preço mínimo em ETH"
          aria-valuetext={`${valueInEth(range[0])} ETH`}
        />
        <Slider.Thumb
          className="price-thumb"
          aria-label="Preço máximo em ETH"
          aria-valuetext={`${valueInEth(range[1])} ETH`}
        />
      </Slider.Root>
      <Button type="submit" variant="outline">
        Aplicar
      </Button>
    </form>
  );
}
