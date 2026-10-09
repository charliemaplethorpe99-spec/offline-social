import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('no-scroll companion demo',()=>{
  it('has no discovery navigation and labels its content as demo data',()=>{
    render(<App/>);
    expect(screen.getByText('DEMO MODE')).toBeInTheDocument();
    expect(screen.queryByText(/Explore|For You|Reels discovery/i)).not.toBeInTheDocument();
    expect(screen.getByText(/messages are sample data and stay on this device/i)).toBeInTheDocument();
  });
  it('requires a deliberate bounded action to show earlier messages',()=>{
    render(<App/>);
    expect(screen.getByRole('button',{name:/Load earlier messages/i})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/Load earlier messages/i}));
    expect(screen.queryByRole('button',{name:/Load earlier messages/i})).not.toBeInTheDocument();
    expect(screen.getByText('I finally went for that long walk by the river.')).toBeInTheDocument();
  });
  it('has no autoplaying video and keeps shared Reel media URL-only',()=>{
    render(<App/>);
    expect(document.querySelector('video[autoplay]')).toBeNull();
    expect(screen.getByText('URL preview only · not playable here')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Open in Instagram/i})).toHaveAttribute('target','_blank');
  });
  it('clearly marks replies as local demo activity',()=>{
    render(<App/>);
    fireEvent.change(screen.getByRole('textbox',{name:'Message'}),{target:{value:'See you soon'}});
    fireEvent.click(screen.getByRole('button',{name:'Send demo message'}));
    expect(screen.getByText('See you soon')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Nothing was sent to Instagram/i);
  });
  it('explains professional account limits before enabling demo mode',()=>{
    render(<App/>);
    fireEvent.click(screen.getAllByRole('button',{name:'Settings'})[0]);
    expect(screen.getByText(/Only professional Creator and Business accounts/i)).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/Try demo mode/i})).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button',{name:/Try demo mode/i})).toBeEnabled();
    fireEvent.click(screen.getByRole('button',{name:/Try demo mode/i}));
    expect(screen.getByRole('status')).toHaveTextContent(/No Instagram account was connected/i);
  });
  it('requires an explicit review step and does not claim a demo publish succeeded',()=>{
    render(<App/>);
    fireEvent.click(screen.getAllByRole('button',{name:'Create'})[0]);
    const photo=new File(['fake-image'],'moment.png',{type:'image/png'});
    fireEvent.change(screen.getByLabelText(/Choose a photo to preview/i),{target:{files:[photo]}});
    fireEvent.click(screen.getByRole('button',{name:/Review draft/i}));
    expect(screen.getByRole('dialog')).toHaveTextContent(/nothing can be published/i);
    fireEvent.click(screen.getByRole('button',{name:'Done'}));
    expect(screen.getByRole('status')).toHaveTextContent(/no content was published to Instagram/i);
  });
});
