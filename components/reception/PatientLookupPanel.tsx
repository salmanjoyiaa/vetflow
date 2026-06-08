'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  lookupCustomerByPhoneAction,
  searchCustomersAction,
  type CustomerSearchResult,
} from '@/lib/services/customer-actions';
import { createPetAction } from '@/lib/services/pet-actions';
import { looksLikePhone } from '@/lib/reception/phone';
import { Loader2, Phone, Heart, UserPlus, Plus } from 'lucide-react';

export type SelectedPatient = {
  customer: CustomerSearchResult;
  pet: { id: string; name: string; species: string; breed: string };
};

interface PatientLookupPanelProps {
  activeBranchId: string;
  onSelect: (selection: SelectedPatient) => void;
  selected?: SelectedPatient | null;
  onClear?: () => void;
}

export default function PatientLookupPanel({
  activeBranchId,
  onSelect,
  selected,
  onClear,
}: PatientLookupPanelProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [owner, setOwner] = useState<CustomerSearchResult | null>(null);
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetSpecies, setNewPetSpecies] = useState('Dog');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [isAddingPet, setIsAddingPet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (val: string) => {
    setQuery(val);
    setError(null);
    if (val.trim().length < 2) {
      setResults([]);
      setOwner(null);
      return;
    }
    setIsSearching(true);
    try {
      if (looksLikePhone(val)) {
        const res = await lookupCustomerByPhoneAction(val);
        if (res.success && res.customer) {
          setOwner(res.customer);
          setResults([]);
        } else if (res.success) {
          setOwner(null);
          setResults([]);
        } else {
          setError(res.error || 'Lookup failed');
        }
      } else {
        const res = await searchCustomersAction(val);
        if (res.success && res.customers) {
          setResults(res.customers);
          setOwner(null);
        } else {
          setError(res.error || 'Search failed');
        }
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectPet = (customer: CustomerSearchResult, petId: string) => {
    const pet = customer.pets.find((p) => p.id === petId);
    if (!pet) return;
    onSelect({ customer, pet });
    setShowAddPet(false);
    setQuery('');
    setResults([]);
    setOwner(null);
  };

  const handleAddPet = async () => {
    if (!owner || !newPetName.trim()) return;
    setIsAddingPet(true);
    setError(null);
    try {
      const res = await createPetAction({
        customerId: owner.id,
        name: newPetName.trim(),
        species: newPetSpecies,
        breed: newPetBreed.trim() || undefined,
        gender: 'Male',
      });
      if (res.success && res.pet) {
        const pet = {
          id: res.pet.id,
          name: res.pet.name,
          species: res.pet.species,
          breed: res.pet.breed || '',
        };
        onSelect({
          customer: {
            ...owner,
            pets: [...owner.pets, pet],
          },
          pet,
        });
        setShowAddPet(false);
        setNewPetName('');
        setOwner(null);
        setQuery('');
      } else {
        setError(res.error || 'Failed to add pet');
      }
    } finally {
      setIsAddingPet(false);
    }
  };

  if (selected) {
    return (
      <div className="flex items-center justify-between p-3 bg-surface-container/50 rounded-xl border border-outline-variant/50">
        <div className="flex items-center gap-3">
          <Heart className="w-4 h-4 text-primary" />
          <div>
            <span className="text-xs font-bold text-on-surface block">{selected.pet.name}</span>
            <span className="text-[10px] text-on-surface-variant">
              {selected.customer.firstName} {selected.customer.lastName} · {selected.customer.phone}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] text-primary font-bold"
        >
          Change
        </button>
      </div>
    );
  }

  const displayOwner = owner;

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold text-on-surface-variant uppercase block">
        Find by phone (recommended) or name
      </label>
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
        <input
          type="search"
          placeholder="e.g. 555-9090 or owner name"
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
        )}
      </div>

      {error && (
        <p className="text-[10px] text-destructive">{error}</p>
      )}

      {displayOwner && (
        <div className="border border-primary/20 rounded-xl p-3 bg-primary/5 space-y-2">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-on-surface">
              {displayOwner.firstName} {displayOwner.lastName}
            </span>
            <span className="text-[10px] text-on-surface-variant">{displayOwner.phone}</span>
          </div>
          {displayOwner.pets.length > 0 ? (
            <ul className="space-y-1">
              {displayOwner.pets.map((pet) => (
                <li key={pet.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectPet(displayOwner, pet.id)}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface-container-high text-xs font-semibold text-primary"
                  >
                    {pet.name} ({pet.species})
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-on-surface-variant italic">No pets on file yet.</p>
          )}
          {!showAddPet ? (
            <button
              type="button"
              onClick={() => setShowAddPet(true)}
              className="text-[10px] font-bold text-primary flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add new pet for this owner
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <input
                placeholder="Pet name"
                value={newPetName}
                onChange={(e) => setNewPetName(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface-container"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newPetSpecies}
                  onChange={(e) => setNewPetSpecies(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface-container"
                >
                  <option>Dog</option>
                  <option>Cat</option>
                  <option>Bird</option>
                  <option>Other</option>
                </select>
                <input
                  placeholder="Breed (optional)"
                  value={newPetBreed}
                  onChange={(e) => setNewPetBreed(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface-container"
                />
              </div>
              <button
                type="button"
                disabled={isAddingPet}
                onClick={handleAddPet}
                className="text-xs font-bold text-primary"
              >
                {isAddingPet ? 'Saving...' : 'Save pet & select'}
              </button>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <ul className="border border-outline-variant rounded-xl divide-y divide-outline-variant/50 max-h-48 overflow-y-auto">
          {results.map((c) =>
            (c.pets.length ? c.pets : [{ id: '', name: '(no pets)', species: '', breed: '' }]).map(
              (pet) =>
                pet.id ? (
                  <li key={`${c.id}-${pet.id}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectPet(c, pet.id)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-container-high text-xs"
                    >
                      <span className="font-semibold text-on-surface block">
                        {pet.name} ({pet.species})
                      </span>
                      <span className="text-on-surface-variant">
                        {c.firstName} {c.lastName} · {c.phone}
                      </span>
                    </button>
                  </li>
                ) : (
                  <li key={c.id} className="px-3 py-2 text-[10px] text-on-surface-variant">
                    {c.firstName} {c.lastName} — no pets;{' '}
                    <Link href={`/dashboard/customers/${c.id}`} className="text-primary font-bold">
                      add pet
                    </Link>
                  </li>
                )
            )
          )}
        </ul>
      )}

      {query.length >= 2 && !isSearching && !displayOwner && results.length === 0 && (
        <p className="text-[10px] text-on-surface-variant">
          No match.{' '}
          <Link
            href={`/dashboard/customers?phone=${encodeURIComponent(query)}`}
            className="text-primary font-semibold hover:underline"
          >
            Register new owner
          </Link>
        </p>
      )}
    </div>
  );
}
