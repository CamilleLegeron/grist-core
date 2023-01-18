import { theme } from "app/client/ui2018/cssVars";
import { icon } from "app/client/ui2018/icons";
import { dom, DomArg, IDisposableOwner, styled } from "grainjs";

/**
 * Creates a toggle info button - little circle button with an i inside, used
 * for column label and description.
 */
export function infoToggle(obs: IDisposableOwner, ...args: DomArg[]) {
  const contextInfo = cssInfoToggle(
    icon('Info', dom.cls('info_toggle_icon')),
    ...args
  );
  return contextInfo;
}

const cssInfoToggle = styled('div.info_toggle', `
  // background: ${theme.infoToggleFg};
  cursor: pointer;
  --icon-color: ${theme.infoToggleFg};
  border-radius: 50%;
  &:hover  {
    --icon-color: ${theme.infoToggleHoverFg};
  }
  &:active  {
    --icon-color: ${theme.infoToggleActiveFg};
  }
  & > .info_toggle_icon {
    display: block; /* don't create a line */
  }
`);
