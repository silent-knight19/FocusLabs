import React from 'react';
import { useTooltip } from '../hooks/useTooltip';
import { Tooltip } from './Tooltip';

/**
 * Wrapper component that adds 1-second delayed tooltip to any clickable element
 * Works with buttons, divs, or any element with onClick
 * @param {React.ReactElement} children - The element to wrap (button, div, etc.)
 * @param {string} tooltipText - The tooltip text to display
 */
export function ButtonWithTooltip({ children, tooltipText }) {
  const { isVisible, position, handlers } = useTooltip(tooltipText);

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: (e) => {
          handlers.onMouseEnter(e);
          if (children.props.onMouseEnter) {
            children.props.onMouseEnter(e);
          }
        },
        onMouseLeave: (e) => {
          handlers.onMouseLeave();
          if (children.props.onMouseLeave) {
            children.props.onMouseLeave(e);
          }
        }
      })}
      <Tooltip isVisible={isVisible} position={position} text={tooltipText} />
    </>
  );
}

// Alias for clarity when used with non-button elements
export const WithTooltip = ButtonWithTooltip;

export default ButtonWithTooltip;
