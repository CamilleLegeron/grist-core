import { makeT } from 'app/client/lib/localization';
import { Computed, dom, MultiHolder, Observable, styled } from 'grainjs';
import { testId, theme, vars } from '../ui2018/cssVars';
import { textarea, textInput } from './inputs';
import { cssBlockedCursor } from './RightPanelStyles';
import { IRowModel } from '../models/DocModel';
import { sanitizeIdent } from 'app/common/gutil';
import { basicButton, primaryButton } from '../ui2018/buttons';

const kd = require('../lib/koDom');

const t = makeT('ColumnInfo');

interface IColumnInfo {
  origColumn: IRowModel<"_grist_Tables_column">;
  isReadonly: boolean;
}

export function ColumnInfo(owner: MultiHolder, options: IColumnInfo) {
  const { origColumn, isReadonly } = options;

  const editedLabel = Observable.create(owner, origColumn.label.peek());
  const editableColId = Computed.create(owner, editedLabel, (use, edited) =>
    '$' + (edited ? sanitizeIdent(edited) : use(origColumn.colId)));

  const editedDescription = Observable.create(owner, '');

  return [
    cssLabel(t("COLUMN LABEL")),
    cssRow(
      dom.cls(cssBlockedCursor.className, isReadonly),
      cssColLabelBlock(
        cssInput(editedLabel,
          dom.boolAttr('readonly', isReadonly),
          testId('field-label'),
        ),
        // TODO : make the printed value change when save
        dom('div.g-column-id',
          t("COLUMN ID: "),
          editableColId.get(),
          kd.style('margin-top', '8px'),
          kd.style('color', 'grey'),
          testId('field-col-id'),
        ),
      ),
    ),
    cssLabel(t("COLUMN DESCRIPTION")),
    cssRow(
      // TODO : save on db the value
      cssTextArea(editedDescription, {})
    ),
    cssRow(
      cssSaveButton(
        t("Save"),
        dom.on('click', async () => { await origColumn.label.saveOnly(editedLabel.get()); }),
      ),
      cssCancelButton(
        t("Cancel"),
        dom.on('click', () => editedLabel.set(origColumn.label.peek())),
      )
    )
  ]
}

const cssLabel = styled('div', `
  color: ${theme.text};
  text-transform: uppercase;
  margin: 16px 16px 12px 16px;
  font-size: ${vars.mediumFontSize};
`);

export const cssRow = styled('div', `
  display: flex;
  margin: 8px 16px;
  align-items: center;
  color: ${theme.text};
  &-top-space {
    margin-top: 24px;
  }
  &-disabled {
    color: ${theme.disabledText};
  }
`);

const cssInput = styled(textInput, `
  color: ${theme.inputFg};
  background-color: ${theme.mainPanelBg};
  border: 1px solid ${theme.inputBorder};
  height: 32px;
  padding: 10px;

  &::placeholder {
    color: ${theme.inputPlaceholderFg};
  }

  &[readonly] {
    background-color: ${theme.inputDisabledBg};
    color: ${theme.inputDisabledFg};
  }
`);

const cssTextArea = styled(textarea, `
  color: ${theme.inputFg};
  background-color: ${theme.mainPanelBg};
  border: 1px solid ${theme.inputBorder};
  width: 100%;
  padding: 10px;

  &::placeholder {
    color: ${theme.inputPlaceholderFg};
  }

  &[readonly] {
    background-color: ${theme.inputDisabledBg};
    color: ${theme.inputDisabledFg};
  }
`);

const cssColLabelBlock = styled('div', `
  display: flex;
  flex-direction: column;
  flex: auto;
  min-width: 80px;
`);

const cssSaveButton = styled(primaryButton, `
  display: flex;
  margin: 8px 8px 0 0;
  gap: 4px;
`);

const cssCancelButton = styled(basicButton, `
  display: flex;
  margin: 8px 8px 0 0;
  gap: 4px;
`);
