import {GristDoc} from 'app/client/components/GristDoc';
import {makeT} from 'app/client/lib/localization';
import {reportError} from 'app/client/models/AppModel';
import {DocModel, ViewSectionRec} from 'app/client/models/DocModel';
import {FilterConfig} from 'app/client/ui/FilterConfig';
import {cssLabel, cssSaveButtonsRow} from 'app/client/ui/RightPanelStyles';
import {hoverTooltip} from 'app/client/ui/tooltips';
import {SortConfig} from 'app/client/ui/SortConfig';
import {makeViewLayoutMenu} from 'app/client/ui/ViewLayoutMenu';
import {basicButton, primaryButton} from 'app/client/ui2018/buttons';
import {theme, vars} from 'app/client/ui2018/cssVars';
import {icon} from 'app/client/ui2018/icons';
import {menu} from 'app/client/ui2018/menus';
import {Computed, dom, IDisposableOwner, makeTestId, styled} from 'grainjs';
import {defaultMenuOptions} from 'popweasel';

const testId = makeTestId('test-section-menu-');
const t = makeT('ViewSectionMenu');

// Handler for [Save] button.
async function doSave(docModel: DocModel, viewSection: ViewSectionRec): Promise<void> {
  await docModel.docData.bundleActions(t("Update Sort&Filter settings"), () => Promise.all([
    viewSection.activeSortJson.save(),      // Save sort
    viewSection.saveFilters(),              // Save filter
    viewSection.activeCustomOptions.save(), // Save widget options
  ]));
}

// Handler for [Revert] button.
function doRevert(viewSection: ViewSectionRec) {
  viewSection.activeSortJson.revert();      // Revert sort
  viewSection.revertFilters();              // Revert filter
  viewSection.activeCustomOptions.revert(); // Revert widget options
}

// [Filter Icon] - Filter toggle and all the components in the menu.
export function viewSectionMenu(
  owner: IDisposableOwner,
  gristDoc: GristDoc,
  viewSection: ViewSectionRec,
) {
  const {docModel, isReadonly} = gristDoc;

  // If there is any filter (should [Filter Icon] background be filled).
  const anyFilter = Computed.create(owner, (use) =>  Boolean(use(viewSection.activeFilters).length));

  // Should we show [Save] [Revert] buttons.
  const displaySaveObs: Computed<boolean> = Computed.create(owner, (use) => (
    use(viewSection.filterSpecChanged)
      || !use(viewSection.activeSortJson.isSaved)
      || !use(viewSection.activeCustomOptions.isSaved)
  ));

  const save = () => { doSave(docModel, viewSection).catch(reportError); };
  const revert = () => doRevert(viewSection);

  return [
    cssFilterMenuWrapper(
      cssFixHeight.cls(''),
      cssFilterMenuWrapper.cls('-unsaved', displaySaveObs),
      testId('wrapper'),
      cssMenu(
        testId('sortAndFilter'),
        // [Filter icon]
        cssFilterIconWrapper(
          testId('filter-icon'),
          // Fill background when there are some filters. Ignore sort options.
          cssFilterIconWrapper.cls('-any', anyFilter),
          cssFilterIcon('Filter'),
          hoverTooltip('Sort and filter', {key: 'sortFilterBtnTooltip'}),
        ),
      ),
      // [Save] [Revert] buttons when there are unsaved options.
      dom.maybe(displaySaveObs, () => cssSectionSaveButtonsWrapper(
        cssSaveTextButton(
          t("Save"),
          cssSaveTextButton.cls('-accent'),
          dom.on('click', save),
          hoverTooltip('Save sort & filter settings', {key: 'sortFilterBtnTooltip'}),
          testId('small-btn-save'),
          dom.hide(isReadonly),
        ),
        cssRevertIconButton(
          cssRevertIcon('Revert', cssRevertIcon.cls('-normal')),
          dom.on('click', revert),
          hoverTooltip('Revert sort & filter settings', {key: 'sortFilterBtnTooltip'}),
          testId('small-btn-revert'),
        ),
      )),
      menu(ctl => [
        // Sort section.
        makeSortPanel(viewSection, gristDoc),
        // Filter section.
        makeFilterPanel(viewSection),
        // Widget options
        dom.maybe(use => use(viewSection.parentKey) === 'custom', () =>
          makeCustomOptions(viewSection)
        ),
        // [Save] [Revert] buttons
        dom.domComputed(displaySaveObs, displaySave => [
          displaySave ? cssSaveButtonsRow(
            cssSaveButton(t("Save"), testId('btn-save'),
                          dom.on('click', () => { ctl.close(); save(); }),
                          dom.boolAttr('disabled', isReadonly)),
            basicButton(t("Revert"), testId('btn-revert'),
                        dom.on('click', () => { ctl.close(); revert(); }))
          ) : null,
        ]),
        // Updates to active sort or filters can cause menu contents to grow, while
        // leaving the position of the popup unchanged. This can sometimes lead to
        // the menu growing beyond the boundaries of the viewport. To mitigate this,
        // we subscribe to changes to the sort/filters and manually update the popup's
        // position, which will re-position the popup if necessary so that it's fully
        // visible.
        dom.autoDispose(viewSection.activeFilters.addListener(() => ctl.update())),
        dom.autoDispose(viewSection.activeSortJson.subscribe(() => ctl.update())),
      ], {...defaultMenuOptions, placement: 'bottom-end', trigger: [
        // Toggle the menu whenever the filter icon button is clicked.
        (el, ctl) => dom.onMatchElem(el, '.test-section-menu-sortAndFilter', 'click', () => {
          ctl.toggle();
        }),
        // Close the menu whenever the save or revert button is clicked.
        (el, ctl) => dom.onMatchElem(el, '.test-section-menu-small-btn-save', 'click', () => {
          ctl.close();
        }),
        (el, ctl) => dom.onMatchElem(el, '.test-section-menu-small-btn-revert', 'click', () => {
          ctl.close();
        }),
      ]}),
    ),
    cssMenu(
      testId('viewLayout'),
      cssFixHeight.cls(''),
      cssDotsIconWrapper(cssIcon('Dots')),
      menu(_ctl => makeViewLayoutMenu(viewSection, isReadonly.get()), {
        ...defaultMenuOptions,
        placement: 'bottom-end',
      })
    )
  ];
}

function makeSortPanel(section: ViewSectionRec, gristDoc: GristDoc) {
  return [
    cssLabel(t("SORT"), testId('heading-sort')),
    dom.create(SortConfig, section, gristDoc, {
      // Attach content to triggerElem's parent, which is needed to prevent view
      // section menu to close when clicking an item in the advanced sort menu.
      menuOptions: {attach: null},
    }),
  ];
}

function makeFilterPanel(section: ViewSectionRec) {
  return [
    cssLabel(t("FILTER"), testId('heading-filter')),
    dom.create(FilterConfig, section, {
      // Attach content to triggerElem's parent, which is needed to prevent view
      // section menu to close when clicking an item of the add filter menu.
      menuOptions: {attach: null},
    }),
  ];
}

// Custom Options
// (empty)|(customized)|(modified) [Remove Icon]
function makeCustomOptions(section: ViewSectionRec) {
  const color = Computed.create(null, use => use(section.activeCustomOptions.isSaved) ? "-normal" : "-accent");
  const text = Computed.create(null, use => {
    if (use(section.activeCustomOptions)) {
      return use(section.activeCustomOptions.isSaved) ? t("(customized)") : t("(modified)");
    } else {
      return t("(empty)");
    }
  });
  return [
    cssMenuInfoHeader(t("Custom options"), testId('heading-widget-options')),
    cssMenuText(
      dom.autoDispose(text),
      dom.autoDispose(color),
      dom.text(text),
      cssMenuText.cls(color),
      cssSpacer(),
      dom.maybe(use => use(section.activeCustomOptions), () =>
        cssMenuIconWrapper(
          cssIcon('Remove', testId('btn-remove-options'), dom.on('click', () =>
            section.activeCustomOptions(null)
          ))
        ),
      ),
      testId("custom-options")
    )
  ];
}

const clsOldUI = styled('div', ``);

const cssFixHeight = styled('div', `
  margin-top: -3px; /* Section header is 24px, so need to move this up a little bit */
`);

const cssMenu = styled('div', `

  display: inline-flex;
  cursor: pointer;

  border-radius: 3px;
  border: 1px solid transparent;
  &.${clsOldUI.className} {
    margin-top: 0px;
    border-radius: 0px;
  }

  &:hover, &.weasel-popup-open {
    background-color: ${theme.hover};
  }
`);

const cssIconWrapper = styled('div', `
  padding: 3px;
  border-radius: 3px;
  cursor: pointer;
  user-select: none;
`);

const cssMenuIconWrapper = styled(cssIconWrapper, `
  display: flex;
  margin: -3px 0;
  width: 22px;
  height: 22px;

  &:hover, &.weasel-popup-open {
    background-color: ${theme.hover};
  }
  &-changed {
    background-color: ${theme.accentIcon};
  }
  &-changed:hover, &-changed:hover.weasel-popup-open {
    background-color: ${theme.controlHoverFg};
  }
`);

const cssFilterMenuWrapper = styled('div', `
  display: inline-flex;
  margin-right: 10px;
  border-radius: 3px;
  align-items: center;
  &-unsaved {
    border: 1px solid ${theme.accentBorder};
  }
  & .${cssMenu.className} {
    border: none;
  }

`);

const cssIcon = styled(icon, `
  flex: none;
  cursor: pointer;
  background-color: ${theme.lightText};

  .${cssMenuIconWrapper.className}-changed & {
    background-color: ${theme.controlPrimaryFg};
  }

  .${clsOldUI.className} & {
    background-color: ${theme.controlPrimaryFg};
  }

  &-accent {
    background-color: ${theme.accentIcon};
  }
`);

const cssDotsIconWrapper = styled(cssIconWrapper, `
  border-radius: 0px 2px 2px 0px;

  .${clsOldUI.className} & {
    border-radius: 0px;
  }
`);

const cssFilterIconWrapper = styled(cssIconWrapper, `
  border-radius: 2px 0px 0px 2px;
  &-any {
    border-radius: 2px;
    background-color: ${theme.controlSecondaryFg};
  }
  .${cssFilterMenuWrapper.className}-unsaved & {
    background-color: ${theme.controlPrimaryBg};
  }
`);

const cssFilterIcon = styled(cssIcon, `
  .${cssFilterIconWrapper.className}-any & {
    background-color: ${theme.controlPrimaryFg};
  }
  .${cssFilterMenuWrapper.className}-unsaved & {
    background-color: ${theme.controlPrimaryFg};
  }
`);

const cssMenuInfoHeader = styled('div', `
  color: ${theme.menuSubheaderFg};
  font-weight: ${vars.bigControlTextWeight};
  padding: 8px 24px 8px 24px;
  cursor: default;
`);

const cssMenuText = styled('div', `
  display: flex;
  align-items: center;
  padding: 0px 24px 8px 24px;
  cursor: default;
  white-space: nowrap;
  &-accent {
    color: ${theme.accentText};
  }
  &-normal {
    color: ${theme.lightText};
  }
`);

const cssSaveButton = styled(primaryButton, `
  margin-right: 8px;
`);

const cssSaveTextButton = styled('div', `
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: ${vars.mediumFontSize};
  padding: 0px 5px;
  border-right: 1px solid ${theme.accentBorder};

  &-accent {
    color: ${theme.accentText};
  }
`);

const cssRevertIconButton = styled('div', `
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
`);

const cssRevertIcon = styled(icon, `
  --icon-color: ${theme.accentIcon};
  margin: 0 5px 0 5px;
`);

const cssSectionSaveButtonsWrapper = styled('div', `
  padding: 0 1px 0 1px;
  display: flex;
  justify-content: space-between;
  align-self: normal;
`);

const cssSpacer = styled('div', `
  margin: 0 auto;
`);
