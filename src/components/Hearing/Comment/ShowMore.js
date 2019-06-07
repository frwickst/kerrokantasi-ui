import React from 'react';
import PropTypes from 'prop-types';
import {injectIntl, FormattedMessage} from 'react-intl';

/**
 * Functional component to display "Show more reply's button"
 * Keep component simple and effective and contained within comment component hierarchy.
 */
const ShowMore = (props) => {
  /**
   * Event hadler for when hyperlink is clicked.
   * Override and prevent default action so it doesnt act like a hyper link.
   */
  const handleShowMore = (event) => {
    event.preventDefault();
    props.onClickShowMore();
  };

  return (
    <div className="hearing-comment-show-more">
      <span className="hearing-comment-show-more__wrapper">
        <a href="" onClick={handleShowMore}>
          <FormattedMessage id="showMoreReplys" />
          <span className="hearing-comment-show-more__count">{`(${props.numberOfComments})`}</span>
        </a>
      </span>
    </div>
  );
};

ShowMore.propTypes = {
  numberOfComments: PropTypes.number.isRequired,
  onClickShowMore: PropTypes.func.isRequired,
};

export default injectIntl(ShowMore);