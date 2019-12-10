import React, { Component } from 'react';
import queryString from 'query-string';
import { Spin, Checkbox, Divider, Button, Input } from 'antd';

import 'antd/dist/antd.css';
import './App.css';

import facebookLoginImage from "./assets/facebook-login.png";

const Mode = Object.freeze({
  START: 'START',
  LIST: 'LIST',
  POST: 'POST',
  FINISH: 'FINISH'
});

const CreateResult = Object.freeze({
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
});

class App extends Component {
  constructor() {
    super();

    this.state = {
      mode: Mode.START,
      isLoading: false,
      token: null,
      groupsList: [],

      selectedGroups: {},
      createResult: {},
      createErrors: {},
      createSuccess: {},
      message: null,
      link: null,
    }
  }

  componentDidMount() {
    const queryParams = queryString.parse(window.location.search);

    if (queryParams.token) {
      this.setState({
        token: queryParams.token,
      }, () => this.loadGroups());
    }
  }

  loadGroups = async () => {
    this.setState({
      isLoading: true
    });

    const result = await fetch(`/api/groups?token=${this.state.token}`).then(result => result.json());

    this.setState({
      isLoading: false,
      groupsList: result,
      mode: Mode.LIST
    });
  }

  handleGoToStart = () => {
    this.setState({
      isLoading: false,
      mode: Mode.LIST,
      message: null,
      link: null,
      selectedGroups: {},
      createResult: {},
      createErrors: {},
      createSuccess: {}
    });
  }

  renderStartView = () => {
    return (
      <div className="flex">
        <a href="/auth/login" className="login-link">
          <img src={facebookLoginImage} alt="" />
        </a>
      </div>
    );
  }

  handleSubmit = () => {
    this.setState({
      isLoading: true
    });

    const __selected = [];

    for (const item in this.state.selectedGroups) {
      if (this.state.selectedGroups[item]) {
        __selected.push(item);
      }
    }

    for (const id of __selected) {
      this.setState({
        createResult: {
          [id]: CreateResult.LOADING
        }
      });

      fetch(`/api/create?token=${this.state.token}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupId: id,
          message: this.state.message,
          link: this.state.link
        })
      })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json();

            return this.setState({
              createResult: {
                [id]: CreateResult.ERROR
              },
              createErrors: {
                [id]: error.message ? error.message : JSON.stringify(error)
              }
            });
          }

          const success = await response.json();

          this.setState({
            createResult: {
              [id]: CreateResult.SUCCESS
            },
            createSuccess: {
              [id]: success
            }
          })
        })
    }
    this.setState({
      isLoading: false,
      mode: Mode.FINISH
    });
  }

  handleCheckboxChange = (e, groupId) => {
    this.setState({
      selectedGroups: {
        [groupId]: e.target.checked
      }
    });
  }

  renderListView = () => {
    return (
      <div className="wrap">
        <p>Select groups to publish to:</p>

        <Divider />

        {this.state.groupsList.map(item => (
          <div key={`group_${item.id}`}>
            <Checkbox onChange={(e) => this.handleCheckboxChange(e, item.id)}>
              {this.renderResultTitle(item.id)}
            </Checkbox>
          </div>
        ))}

        <Divider />

        <Button type="primary" onClick={() => this.setState({ mode: Mode.POST })}>
          Go to next step
        </Button>
      </div>
    );
  }

  renderPostView = () => {
    return (
      <div className="wrap">
        <p>Type message:</p>

        <Divider />

        <Input.TextArea
          onChange={e => this.setState({ message: e.target.value })}
          rows={10}
          value={this.state.message}
        />

        <Divider />
        
        <p>Add attachment link (optional):</p>

        <Input
          onChange={e => this.setState({ link: e.target.value })}
          value={this.state.link}
        />

        <Divider />

        <Button type="primary" onClick={() => this.handleSubmit()}>
          Submit
        </Button>

        <Divider />

        <Button onClick={() => this.handleGoToStart()}>
          Start again
        </Button>
      </div>
    );
  }

  renderResultIcon = (id) => {
    const result = this.state.createResult[id];

    switch (result) {
      case CreateResult.LOADING:
        return <Spin />;
      case CreateResult.SUCCESS:
        return <span role="img" aria-label="success">✅</span>;
      case CreateResult.ERROR:
        return <span role="img" aria-label="error">❌</span>;
      default:
        return null;
    }
  }

  renderResultTitle = (id) => {
    const item = this.state.groupsList.find(item => item.id === id);

    return <span>{item.name} [ ID = {item.id} ]</span>
  }

  renderResultDetails = (id) => {
    const result = this.state.createResult[id];

    if (result === CreateResult.LOADING) {
      return null;
    }

    if (result === CreateResult.SUCCESS) {
      const success = this.state.createSuccess[id];

      return <span>– <a href={success.url} target="_blank" rel="noopener noreferrer">Link to post</a></span>;
    }

    if (result === CreateResult.ERROR) {
      const error = this.state.createErrors[id];

      return <span>– <span color="F00">{error}</span></span>;
    }
  }

  renderFinishView = () => {
    return (
      <div className="wrap">
        <p>Creating posts...</p>

        <Divider />

        {Object.keys(this.state.createResult).map(id => (
          <div key={`result_${id}`}>
            {this.renderResultIcon(id)} {this.renderResultTitle(id)} {this.renderResultDetails(id)}
          </div>
        ))}

        <Divider />

        <Button onClick={() => this.handleGoToStart()}>
          Start again
        </Button>
      </div>
    );
  }

  renderErrorView = () => {
    return 'Error';
  }

  renderSpinner = () => {
    return (
      <div className="flex">
        <Spin />
      </div>
    )
  }

  renderView = () => {
    if (this.state.isLoading) {
      return this.renderSpinner();
    }

    switch (this.state.mode) {
      case Mode.START:
        return this.renderStartView();
      case Mode.LIST:
        return this.renderListView();
      case Mode.POST:
        return this.renderPostView();
      case Mode.FINISH:
        return this.renderFinishView();
      default:
        return this.renderErrorView();
    }
  }

  render() {
    return (
      <>
        {this.renderView()}
      </>
    );
  }
}

export default App;
