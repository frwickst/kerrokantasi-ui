/* eslint-disable react/no-multi-comp */
import React from 'react';
import PropTypes from 'prop-types';
import {Nav, NavItem, FormGroup, FormControl, ControlLabel, Checkbox, Row, Col, Label} from 'react-bootstrap';
import {FormattedMessage, injectIntl} from 'react-intl';
import {Link} from 'react-router';
import FormatRelativeTime from '../utils/FormatRelativeTime';
import Icon from '../utils/Icon';
import {getHearingURL} from '../utils/hearing';
import LabelList from './LabelList';
import LoadSpinner from './LoadSpinner';
import getAttr from '../utils/getAttr';
import HearingsSearch from './HearingsSearch';
import config from '../config';
import OverviewMap from '../components/OverviewMap';
import {keys, capitalize} from 'lodash';

import {labelShape} from '../types';

const HEARING_LIST_TABS = {
  LIST: 'list',
  MAP: 'map'
};

const HearingListTabs = ({activeTab, changeTab}) =>
  <Nav className="hearing-list__tabs" bsStyle="tabs" activeKey={activeTab}>
    <NavItem eventKey="3" disabled className="hearing-list__tabs-empty"/>
    {
      keys(HEARING_LIST_TABS).map((key) => {
        const value = HEARING_LIST_TABS[key];
        return (
          <NavItem key={key} eventKey={value} title={capitalize(value)} onClick={() => changeTab(value)}>
            <FormattedMessage id={value}/>
          </NavItem>
        );
      })
    }
  </Nav>;

HearingListTabs.propTypes = {
  activeTab: PropTypes.string,
  changeTab: PropTypes.func
};

const HearingListFilters = ({handleSort}) =>
  <div className="hearing-list__filter-bar">
    <FormGroup controlId="formControlsSelect" className="hearing-list__filter-bar-filter">
      <FormControl componentClass="select" placeholder="select" onChange={(event) => handleSort(event.target.value)}>
        <option value="-created_at"><FormattedMessage id="newestFirst"/></option>
        <option value="created_at"><FormattedMessage id="oldestFirst"/></option>
        <option value="-close_at"><FormattedMessage id="lastClosing"/></option>
        <option value="close_at"><FormattedMessage id="firstClosing"/></option>
        <option value="-open_at"><FormattedMessage id="lastOpen"/></option>
        <option value="open_at"><FormattedMessage id="firstOpen"/></option>
        <option value="-n_comments"><FormattedMessage id="mostCommented"/></option>
        <option value="n_comments"><FormattedMessage id="leastCommented"/></option>
      </FormControl>
    </FormGroup>
    <ControlLabel className="hearing-list__filter-bar-label"><FormattedMessage id="sort"/></ControlLabel>
  </div>;

HearingListFilters.propTypes = {
  handleSort: PropTypes.func,
};

class HearingListItem extends React.Component {

  render() {
    const hearing = this.props.hearing;
    const mainImage = hearing.main_image;
    let mainImageStyle = {
      backgroundImage: 'url(/assets/images/default-image.svg)'
    };
    if (hearing.main_image) {
      mainImageStyle = {
        backgroundImage: 'url("' + mainImage.url + '")'
      };
    }

    const {language} = this.props;
    const translationAvailable = !!getAttr(hearing.title, language, {exact: true});
    const availableInLanguageMessages = {
      fi: 'Kuuleminen saatavilla suomeksi',
      sv: 'Hörandet tillgängligt på svenska',
      en: 'Questionnaire available in English'};

    return (<div className="hearing-list-item">
      {
        !translationAvailable &&
        <Link to={getHearingURL(hearing)} className="hearing-card-notice">
          <div className="notice-content">
            <FormattedMessage id="hearingTranslationNotAvailable"/>
            {config.languages.map((lang) => (
              getAttr(hearing.title, lang, {exact: true}) ?
                <div key={lang} className="language-available-message">{availableInLanguageMessages[lang]}</div> :
                null))}
          </div>
        </Link>
      }
      <div className="hearing-list-item-image" style={mainImageStyle} />
      <div className="hearing-list-item-content">
        <div className="hearing-list-item-labels">
          <LabelList labels={hearing.labels} className="hearing-list-item-labellist"/>
          <div className="hearing-list-item-closed">
            {hearing.closed ? <Label><FormattedMessage id="hearingClosed"/></Label> : null}
          </div>
        </div>
        <div className="hearing-list-item-title-wrap">
          <h4 className="hearing-list-item-title">
            {!hearing.published ? <Icon name="eye-slash"/> : null}
            <Link to={getHearingURL(hearing)}>{getAttr(hearing.title, language)}</Link>
          </h4>
          <div className="hearing-list-item-comments">
            <Icon name="comment-o"/>&nbsp;{hearing.n_comments}
          </div>
        </div>
        <div className="hearing-list-item-times">
          <div>
            <FormatRelativeTime messagePrefix="timeOpen" timeVal={hearing.open_at}/>
          </div>
          <div>
            <FormatRelativeTime messagePrefix="timeClose" timeVal={hearing.close_at}/>
          </div>
        </div>
      </div>
    </div>);
  }
}

HearingListItem.propTypes = {
  hearing: PropTypes.object,
  language: PropTypes.string
};

class HearingList extends React.Component {

  constructor(props) {
    super(props);

    this.state = {activeTab: props.initialTab};

    this.handleTabChange = this.handleTabChange.bind(this);
  }

  handleTabChange(tabName) {
    if (typeof this.props.onTabChange === 'function') {
      this.props.onTabChange(tabName);
    }
    this.setState({activeTab: tabName});
  }

  render() {
    const {
      hearings,
      isLoading,
      labels,
      handleSort,
      handleSearch,
      handleLabelSearch,
      searchPhrase,
      language,
      showOnlyOpen,
      toggleShowOnlyOpen,
      isMobile} = this.props;
    const hearingsToShow = !showOnlyOpen ? hearings : hearings.filter((hearing) => !hearing.closed);
    const {activeTab} = this.state;
    const hasHearings = hearings && hearings.length;

    const hearingListMap = (hearingsToShow ? (<Col xs={12}>
      <div className="hearing-list-map map">
        <Checkbox
          inline
          readOnly
          checked={showOnlyOpen}
          onChange={() => toggleShowOnlyOpen()}
          style={{marginBottom: 10}}
        >
          <FormattedMessage id="showOnlyOpen"/>
        </Checkbox>
        <OverviewMap
          hearings={hearingsToShow}
          style={{width: '100%', height: isMobile ? '100%' : 600}}
          enablePopups
        />
      </div>
    </Col>) : null);

    return (
      labels && labels.length
        ? <div>
          <section className="page-section--hearings-search">
            <div className="container">
              <Row>
                <Col md={10} mdPush={1}>
                  <HearingsSearch
                    handleSearch={handleSearch}
                    labels={labels}
                    handleLabelSearch={handleLabelSearch}
                    language={language}
                    searchPhrase={searchPhrase}
                  />
                </Col>
              </Row>
            </div>
          </section>
          <section className="page-section--hearings-tabs">
            <div className="container">
              <HearingListTabs activeTab={activeTab} changeTab={this.handleTabChange} />
            </div>
          </section>
          <section className="page-section page-section--hearings-list">
            <div className="container">
              {isLoading && <LoadSpinner />}
              {!isLoading && !hasHearings ? <p><FormattedMessage id="noHearings"/></p> : null}
              {hasHearings && activeTab === 'list' ?
                <Col md={8} mdPush={2}>
                  <div className={`hearing-list${isLoading ? '-hidden' : ''}`}>
                    <HearingListFilters handleSort={handleSort}/>
                    {hearings.map(
                      (hearing) => <HearingListItem hearing={hearing} key={hearing.id} language={language}/>
                    )}
                  </div>
                </Col>
                : null
              }
              {hasHearings && activeTab === 'map' && !isLoading ? hearingListMap : null}
            </div>
          </section>
        </div>
        : null
    );
  }
}

HearingList.propTypes = {
  hearings: PropTypes.array,
  labels: PropTypes.arrayOf(labelShape),
  isLoading: PropTypes.bool,
  handleSort: PropTypes.func,
  handleSearch: PropTypes.func,
  handleLabelSearch: PropTypes.func,
  language: PropTypes.string,
  initialTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func,
  showOnlyOpen: PropTypes.bool,
  toggleShowOnlyOpen: PropTypes.func,
  searchPhrase: PropTypes.string,
  isMobile: PropTypes.bool
};

HearingList.defaultProps = {
  initialTab: HEARING_LIST_TABS.LIST
};

export default (injectIntl(HearingList));
